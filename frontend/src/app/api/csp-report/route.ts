import { NextRequest, NextResponse } from "next/server";

/**
 * CSP Violation Report Endpoint
 * Receives Content-Security-Policy violation reports from browsers.
 * Used to monitor violations before enforcing stricter CSP policies.
 */
export async function POST(request: NextRequest) {
  try {
    const report = await request.json();

    // Log CSP violations for monitoring
    // In production, this should be sent to your logging/monitoring service
    console.error("CSP Violation Report:", JSON.stringify(report, null, 2));

    // Optionally forward to Sentry or other monitoring
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureMessage('CSP Violation', {
    //     level: 'warning',
    //     extra: report,
    //   });
    // }

    return NextResponse.json({ status: "received" }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Invalid report format" },
      { status: 400 }
    );
  }
}

// Also handle report-to format which sends as JSON
export async function GET() {
  return NextResponse.json(
    { error: "POST method required for CSP reports" },
    { status: 405 }
  );
}
