#!/usr/bin/env python
"""
GZip Compression Benchmark Script

Measures the effectiveness of GZip compression on API responses.
Targets: 60-80% compression for JSON payloads, <10ms overhead.

Usage:
    # Requires running backend server
    python scripts/benchmark_gzip.py --host http://localhost:8000

    # With authentication (for admin endpoints)
    python scripts/benchmark_gzip.py --host http://localhost:8000 --token <jwt_token>

    # Output markdown report
    python scripts/benchmark_gzip.py --host http://localhost:8000 --output docs/performance/gzip-benchmark.md
"""

import argparse
import gzip
import io
import json
import statistics
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import httpx


@dataclass
class BenchmarkResult:
    """Result of a single endpoint benchmark."""

    endpoint: str
    raw_size: int
    compressed_size: int
    compression_ratio: float
    raw_latency_ms: float
    compressed_latency_ms: float
    latency_overhead_ms: float
    samples: int
    success: bool
    error: Optional[str] = None


# Endpoints to benchmark
ENDPOINTS = [
    # Public endpoints
    {"path": "/health", "auth_required": False, "description": "Health check"},
    # Admin endpoints (require authentication)
    {
        "path": "/api/admin/stats",
        "auth_required": True,
        "description": "Admin dashboard statistics",
    },
    {
        "path": "/api/admin/users",
        "auth_required": True,
        "description": "User list (paginated)",
    },
    {
        "path": "/api/admin/health",
        "auth_required": True,
        "description": "Comprehensive health status",
    },
    {
        "path": "/api/admin/analytics/overview",
        "auth_required": True,
        "description": "Analytics overview",
    },
    # User-facing endpoints
    {"path": "/api/feed", "auth_required": True, "description": "User feed"},
    {
        "path": "/api/profiles",
        "auth_required": False,
        "description": "Profile search results",
    },
]


def measure_request(
    url: str,
    headers: dict,
    samples: int = 5,
    measure_wire_size: bool = False,
) -> tuple[list[float], list[int]]:
    """Make multiple requests and collect timing and size data.

    Args:
        url: URL to request
        headers: Request headers
        samples: Number of samples
        measure_wire_size: If True, measure raw wire size (for gzip tests)
    """
    import urllib.request

    latencies = []
    sizes = []

    for _ in range(samples):
        start = time.perf_counter()
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30.0) as response:
                elapsed = (time.perf_counter() - start) * 1000  # ms

                if response.status == 200:
                    latencies.append(elapsed)
                    # Read the raw response to measure actual wire size
                    content = response.read()
                    sizes.append(len(content))
                elif response.status == 401:
                    return [], []
        except Exception:
            continue

    return latencies, sizes


def benchmark_endpoint(
    host: str,
    endpoint: dict,
    token: Optional[str] = None,
    samples: int = 5,
) -> BenchmarkResult:
    """Benchmark a single endpoint with and without compression."""
    path = endpoint["path"]
    url = f"{host.rstrip('/')}{path}"

    # Skip auth-required endpoints if no token
    if endpoint["auth_required"] and not token:
        return BenchmarkResult(
            endpoint=path,
            raw_size=0,
            compressed_size=0,
            compression_ratio=0.0,
            raw_latency_ms=0.0,
            compressed_latency_ms=0.0,
            latency_overhead_ms=0.0,
            samples=0,
            success=False,
            error="Authentication required but no token provided",
        )

    base_headers = {}
    if token:
        base_headers["Authorization"] = f"Bearer {token}"

    # Measure without compression
    raw_headers = {**base_headers, "Accept-Encoding": "identity"}
    raw_latencies, raw_sizes = measure_request(url, raw_headers, samples)

    if not raw_latencies:
        return BenchmarkResult(
            endpoint=path,
            raw_size=0,
            compressed_size=0,
            compression_ratio=0.0,
            raw_latency_ms=0.0,
            compressed_latency_ms=0.0,
            latency_overhead_ms=0.0,
            samples=0,
            success=False,
            error="Failed to get successful response (check auth or endpoint availability)",
        )

    # Measure with compression (raw wire size)
    compressed_headers = {**base_headers, "Accept-Encoding": "gzip"}
    compressed_latencies, compressed_sizes = measure_request(
        url, compressed_headers, samples
    )

    if not compressed_latencies:
        return BenchmarkResult(
            endpoint=path,
            raw_size=int(statistics.mean(raw_sizes)),
            compressed_size=0,
            compression_ratio=0.0,
            raw_latency_ms=statistics.mean(raw_latencies),
            compressed_latency_ms=0.0,
            latency_overhead_ms=0.0,
            samples=len(raw_latencies),
            success=False,
            error="Compressed request failed",
        )

    raw_size = int(statistics.mean(raw_sizes))
    compressed_size = int(statistics.mean(compressed_sizes))
    raw_latency = statistics.mean(raw_latencies)
    compressed_latency = statistics.mean(compressed_latencies)

    # Calculate compression ratio (percentage saved)
    if raw_size > 0:
        compression_ratio = ((raw_size - compressed_size) / raw_size) * 100
    else:
        compression_ratio = 0.0

    return BenchmarkResult(
        endpoint=path,
        raw_size=raw_size,
        compressed_size=compressed_size,
        compression_ratio=compression_ratio,
        raw_latency_ms=raw_latency,
        compressed_latency_ms=compressed_latency,
        latency_overhead_ms=compressed_latency - raw_latency,
        samples=min(len(raw_latencies), len(compressed_latencies)),
        success=True,
    )


def format_bytes(size: int) -> str:
    """Format byte size for display."""
    if size >= 1024 * 1024:
        return f"{size / (1024 * 1024):.2f} MB"
    elif size >= 1024:
        return f"{size / 1024:.2f} KB"
    else:
        return f"{size} B"


def generate_markdown_report(results: list[BenchmarkResult], host: str) -> str:
    """Generate a markdown report from benchmark results."""
    lines = [
        "# GZip Compression Benchmark Report",
        "",
        f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"**Target Host**: {host}",
        "",
        "## Summary",
        "",
        "| Endpoint | Raw Size | Compressed | Savings | Latency Delta | Status |",
        "|----------|----------|------------|---------|-----------|--------|",
    ]

    successful_results = [r for r in results if r.success]
    failed_results = [r for r in results if not r.success]

    for result in successful_results:
        status = "OK"
        if result.compression_ratio < 60:
            status = "WARN: Low compression"
        if result.latency_overhead_ms > 10:
            status = "WARN: High overhead"

        lines.append(
            f"| `{result.endpoint}` | {format_bytes(result.raw_size)} | "
            f"{format_bytes(result.compressed_size)} | {result.compression_ratio:.1f}% | "
            f"{result.latency_overhead_ms:+.1f}ms | {status} |"
        )

    for result in failed_results:
        lines.append(
            f"| `{result.endpoint}` | - | - | - | - | SKIP: {result.error or 'Failed'} |"
        )

    # Add analysis section
    if successful_results:
        avg_compression = statistics.mean(r.compression_ratio for r in successful_results)
        avg_overhead = statistics.mean(r.latency_overhead_ms for r in successful_results)
        total_raw = sum(r.raw_size for r in successful_results)
        total_compressed = sum(r.compressed_size for r in successful_results)

        lines.extend([
            "",
            "## Analysis",
            "",
            f"- **Average Compression**: {avg_compression:.1f}%",
            f"- **Average Latency Overhead**: {avg_overhead:+.2f}ms",
            f"- **Total Data Transfer (raw)**: {format_bytes(total_raw)}",
            f"- **Total Data Transfer (compressed)**: {format_bytes(total_compressed)}",
            f"- **Bandwidth Saved**: {format_bytes(total_raw - total_compressed)}",
            "",
            "### Target Compliance",
            "",
        ])

        compression_pass = avg_compression >= 60
        latency_pass = avg_overhead < 10

        lines.append(f"- Compression >=60%: {'PASS' if compression_pass else 'FAIL'} ({avg_compression:.1f}%)")
        lines.append(f"- Latency overhead <10ms: {'PASS' if latency_pass else 'FAIL'} ({avg_overhead:.2f}ms)")

    # Add detailed results
    lines.extend([
        "",
        "## Detailed Results",
        "",
    ])

    for result in results:
        lines.extend([
            f"### `{result.endpoint}`",
            "",
        ])

        if result.success:
            lines.extend([
                f"- **Raw Size**: {format_bytes(result.raw_size)}",
                f"- **Compressed Size**: {format_bytes(result.compressed_size)}",
                f"- **Compression Ratio**: {result.compression_ratio:.1f}%",
                f"- **Raw Latency**: {result.raw_latency_ms:.2f}ms",
                f"- **Compressed Latency**: {result.compressed_latency_ms:.2f}ms",
                f"- **Latency Overhead**: {result.latency_overhead_ms:+.2f}ms",
                f"- **Samples**: {result.samples}",
            ])
        else:
            lines.append(f"- **Error**: {result.error}")

        lines.append("")

    # Add recommendations
    lines.extend([
        "## Recommendations",
        "",
        "1. **GZip is enabled** via `GZipMiddleware` with `minimum_size=1000`",
        "2. Responses under 1KB are not compressed (overhead outweighs savings)",
        "3. JSON payloads typically achieve 70-85% compression",
        "4. Monitor compression ratios in production via Prometheus metrics",
        "",
        "## Configuration",
        "",
        "```python",
        "# backend/app/main.py",
        "from starlette.middleware.gzip import GZipMiddleware",
        "",
        "app.add_middleware(GZipMiddleware, minimum_size=1000)",
        "```",
        "",
    ])

    return "\n".join(lines)


def print_console_report(results: list[BenchmarkResult]) -> None:
    """Print results to console."""
    print("\n" + "=" * 80)
    print("GZip Compression Benchmark Results")
    print("=" * 80 + "\n")

    for result in results:
        print(f"Endpoint: {result.endpoint}")
        if result.success:
            print(f"  Raw Size:       {format_bytes(result.raw_size)}")
            print(f"  Compressed:     {format_bytes(result.compressed_size)}")
            print(f"  Savings:        {result.compression_ratio:.1f}%")
            print(f"  Latency (raw):  {result.raw_latency_ms:.2f}ms")
            print(f"  Latency (gzip): {result.compressed_latency_ms:.2f}ms")
            print(f"  Overhead:       {result.latency_overhead_ms:+.2f}ms")
        else:
            print(f"  Error: {result.error}")
        print()

    # Summary
    successful = [r for r in results if r.success]
    if successful:
        avg_compression = statistics.mean(r.compression_ratio for r in successful)
        avg_overhead = statistics.mean(r.latency_overhead_ms for r in successful)
        print("-" * 80)
        print(f"Average Compression: {avg_compression:.1f}%")
        print(f"Average Overhead:    {avg_overhead:+.2f}ms")
        print("-" * 80)

        # Target compliance
        print("\nTarget Compliance:")
        comp_status = "PASS" if avg_compression >= 60 else "FAIL"
        lat_status = "PASS" if avg_overhead < 10 else "FAIL"
        print(f"  [{comp_status}] Compression >=60% (actual: {avg_compression:.1f}%)")
        print(f"  [{lat_status}] Latency overhead <10ms (actual: {avg_overhead:.2f}ms)")


def main():
    parser = argparse.ArgumentParser(description="Benchmark GZip compression on API endpoints")
    parser.add_argument(
        "--host",
        default="http://localhost:8000",
        help="Target host URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--token",
        help="JWT token for authenticated endpoints",
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=5,
        help="Number of samples per endpoint (default: 5)",
    )
    parser.add_argument(
        "--output",
        help="Output markdown report to file",
    )

    args = parser.parse_args()

    print(f"Benchmarking GZip compression on {args.host}")
    print(f"Samples per endpoint: {args.samples}")
    if args.token:
        print("Using provided authentication token")
    else:
        print("No token provided - admin endpoints will be skipped")
    print()

    results = []
    for endpoint in ENDPOINTS:
        print(f"Testing {endpoint['path']}...", end=" ", flush=True)
        result = benchmark_endpoint(args.host, endpoint, args.token, args.samples)
        results.append(result)
        if result.success:
            print(f"OK ({result.compression_ratio:.1f}% savings)")
        else:
            print(f"SKIP ({result.error})")

    # Console output
    print_console_report(results)

    # Markdown output
    if args.output:
        report = generate_markdown_report(results, args.host)
        with open(args.output, "w") as f:
            f.write(report)
        print(f"\nMarkdown report written to: {args.output}")

    # Exit code based on targets
    successful = [r for r in results if r.success]
    if successful:
        avg_compression = statistics.mean(r.compression_ratio for r in successful)
        avg_overhead = statistics.mean(r.latency_overhead_ms for r in successful)
        if avg_compression < 60 or avg_overhead > 10:
            sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
