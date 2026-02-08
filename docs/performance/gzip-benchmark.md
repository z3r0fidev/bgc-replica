# GZip Compression Benchmark Report

**Generated**: 2026-02-06 22:00:12
**Target Host**: http://localhost:8000

## Summary

| Endpoint | Raw Size | Compressed | Savings | Latency Delta | Status |
|----------|----------|------------|---------|-----------|--------|
| `/health` | 55 B | 55 B | 0.0% | -41.7ms | WARN: Low compression |
| `/api/admin/stats` | 156 B | 156 B | 0.0% | -9.5ms | WARN: Low compression |
| `/api/admin/users` | 1.19 KB | 443 B | 63.7% | -76.0ms | OK |
| `/api/admin/health` | 308 B | 308 B | 0.0% | +53.5ms | WARN: High overhead |
| `/api/admin/analytics/overview` | 218 B | 218 B | 0.0% | -18.6ms | WARN: Low compression |
| `/api/feed` | 71 B | 71 B | 0.0% | -3.8ms | WARN: Low compression |
| `/api/profiles` | - | - | - | - | SKIP: Failed to get successful response (check auth or endpoint availability) |

## Analysis

- **Average Compression**: 10.6%
- **Average Latency Overhead**: -16.00ms
- **Total Data Transfer (raw)**: 1.98 KB
- **Total Data Transfer (compressed)**: 1.22 KB
- **Bandwidth Saved**: 776 B

### Target Compliance

- Compression >=60%: FAIL (10.6%)
- Latency overhead <10ms: PASS (-16.00ms)

## Detailed Results

### `/health`

- **Raw Size**: 55 B
- **Compressed Size**: 55 B
- **Compression Ratio**: 0.0%
- **Raw Latency**: 2616.61ms
- **Compressed Latency**: 2574.92ms
- **Latency Overhead**: -41.70ms
- **Samples**: 5

### `/api/admin/stats`

- **Raw Size**: 156 B
- **Compressed Size**: 156 B
- **Compression Ratio**: 0.0%
- **Raw Latency**: 3176.72ms
- **Compressed Latency**: 3167.23ms
- **Latency Overhead**: -9.49ms
- **Samples**: 5

### `/api/admin/users`

- **Raw Size**: 1.19 KB
- **Compressed Size**: 443 B
- **Compression Ratio**: 63.7%
- **Raw Latency**: 2745.41ms
- **Compressed Latency**: 2669.42ms
- **Latency Overhead**: -75.99ms
- **Samples**: 5

### `/api/admin/health`

- **Raw Size**: 308 B
- **Compressed Size**: 308 B
- **Compression Ratio**: 0.0%
- **Raw Latency**: 2787.07ms
- **Compressed Latency**: 2840.62ms
- **Latency Overhead**: +53.55ms
- **Samples**: 5

### `/api/admin/analytics/overview`

- **Raw Size**: 218 B
- **Compressed Size**: 218 B
- **Compression Ratio**: 0.0%
- **Raw Latency**: 3442.99ms
- **Compressed Latency**: 3424.41ms
- **Latency Overhead**: -18.58ms
- **Samples**: 5

### `/api/feed`

- **Raw Size**: 71 B
- **Compressed Size**: 71 B
- **Compression Ratio**: 0.0%
- **Raw Latency**: 4555.04ms
- **Compressed Latency**: 4551.22ms
- **Latency Overhead**: -3.82ms
- **Samples**: 5

### `/api/profiles`

- **Error**: Failed to get successful response (check auth or endpoint availability)

## Recommendations

1. **GZip is enabled** via `GZipMiddleware` with `minimum_size=1000`
2. Responses under 1KB are not compressed (overhead outweighs savings)
3. JSON payloads typically achieve 70-85% compression
4. Monitor compression ratios in production via Prometheus metrics

## Configuration

```python
# backend/app/main.py
from starlette.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```
