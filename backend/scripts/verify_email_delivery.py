#!/usr/bin/env python
"""
Email Delivery Verification Script

Tests the email delivery pipeline including:
1. Direct Resend API calls
2. Celery task execution
3. Configuration validation

Usage:
    # Test direct API
    python scripts/verify_email_delivery.py --test direct --to test@example.com

    # Test Celery task
    python scripts/verify_email_delivery.py --test celery --to test@example.com

    # Full verification
    python scripts/verify_email_delivery.py --test all --to test@example.com

    # Configuration check only
    python scripts/verify_email_delivery.py --test config

Environment:
    RESEND_API_KEY: Your Resend API key
    RESEND_FROM_EMAIL: Sender email address (default: noreply@bgclive.online)
    APP_URL: Application URL for email links (default: http://localhost:3000)
"""

import argparse
import asyncio
import os
import sys
import time
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def check_configuration() -> dict:
    """Verify email configuration is properly set."""
    from app.core.config import settings

    results = {
        "resend_api_key": {
            "configured": bool(settings.RESEND_API_KEY),
            "value": settings.RESEND_API_KEY[:8] + "..." if settings.RESEND_API_KEY else None,
        },
        "resend_from_email": {
            "configured": bool(settings.RESEND_FROM_EMAIL),
            "value": settings.RESEND_FROM_EMAIL,
        },
        "app_url": {
            "configured": bool(settings.APP_URL),
            "value": settings.APP_URL,
        },
        "verification_token_expire_hours": {
            "configured": True,
            "value": settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS,
        },
        "password_reset_token_expire_hours": {
            "configured": True,
            "value": settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS,
        },
    }

    all_configured = all(r["configured"] for r in results.values())
    results["all_configured"] = all_configured

    return results


def test_direct_api(to_email: str) -> dict:
    """Test direct Resend API call."""
    import resend
    from app.core.config import settings

    if not settings.RESEND_API_KEY:
        return {
            "success": False,
            "error": "RESEND_API_KEY not configured",
        }

    resend.api_key = settings.RESEND_API_KEY

    test_html = f"""
    <html>
    <body style="font-family: sans-serif; padding: 20px;">
        <h1 style="color: #667eea;">BGCLive Email Test</h1>
        <p>This is a test email sent at {datetime.now().isoformat()}</p>
        <p>If you received this, direct Resend API delivery is working.</p>
        <hr>
        <p style="color: #888; font-size: 12px;">
            Sent from: {settings.RESEND_FROM_EMAIL}<br>
            Environment: {settings.APP_URL}
        </p>
    </body>
    </html>
    """

    try:
        start_time = time.time()
        response = resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": f"[BGCLive Test] Direct API - {datetime.now().strftime('%H:%M:%S')}",
            "html": test_html,
        })
        elapsed = time.time() - start_time

        return {
            "success": True,
            "email_id": response.get("id") if isinstance(response, dict) else str(response),
            "elapsed_ms": round(elapsed * 1000, 2),
            "from": settings.RESEND_FROM_EMAIL,
            "to": to_email,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


async def test_email_service(to_email: str) -> dict:
    """Test email service directly (async)."""
    from app.services.email_service import email_service

    try:
        start_time = time.time()
        result = await email_service.send_verification_email(
            to_email=to_email,
            token="test-verification-token-12345",
            user_name="Test User",
        )
        elapsed = time.time() - start_time

        return {
            "success": result,
            "elapsed_ms": round(elapsed * 1000, 2),
            "to": to_email,
            "type": "verification",
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


def test_celery_task(to_email: str) -> dict:
    """Test Celery task execution."""
    try:
        from app.services.tasks import send_verification_email_task

        # Check if Celery is running by checking the broker connection
        try:
            from app.core.celery_config import celery_app
            celery_app.control.ping(timeout=2)
        except Exception as e:
            return {
                "success": False,
                "error": f"Celery not reachable: {e}",
                "hint": "Make sure Celery worker is running: celery -A app.core.celery_config worker --loglevel=info",
            }

        start_time = time.time()

        # Send task
        result = send_verification_email_task.delay(
            to_email=to_email,
            token="test-celery-token-67890",
            user_name="Celery Test User",
        )

        # Wait for result (with timeout)
        try:
            task_result = result.get(timeout=30)
            elapsed = time.time() - start_time

            return {
                "success": task_result,
                "task_id": result.id,
                "elapsed_ms": round(elapsed * 1000, 2),
                "to": to_email,
                "type": "verification (via Celery)",
            }
        except Exception as e:
            return {
                "success": False,
                "task_id": result.id,
                "error": f"Task execution failed: {e}",
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


def print_results(title: str, results: dict):
    """Pretty print test results."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print('='*60)

    for key, value in results.items():
        if isinstance(value, dict):
            status = "OK" if value.get("success") or value.get("configured") else "FAIL"
            print(f"\n  [{status}] {key}:")
            for k, v in value.items():
                if k not in ("success", "configured"):
                    print(f"      {k}: {v}")
        else:
            print(f"  {key}: {value}")


def print_checklist():
    """Print manual verification checklist."""
    print("""
================================================================================
 EMAIL DELIVERY VERIFICATION CHECKLIST
================================================================================

After running the tests, manually verify the following:

[ ] 1. DIRECT API TEST
    - Email received in inbox (not spam)
    - Subject contains "[BGCLive Test] Direct API"
    - Sender shows correct from address
    - HTML content renders correctly

[ ] 2. CELERY TASK TEST
    - Email received in inbox (not spam)
    - Subject contains "[BGCLive Test] Via Celery"
    - Verification link in email is correctly formatted
    - Link contains test token

[ ] 3. RESEND DASHBOARD (https://resend.com/emails)
    - All test emails appear in sent list
    - No bounces or failures
    - Delivery status shows "delivered"

[ ] 4. PRODUCTION CONSIDERATIONS
    - Verify domain authentication (SPF, DKIM, DMARC)
    - Test with real user email addresses
    - Monitor bounce rates in Resend dashboard
    - Set up Resend webhooks for delivery tracking

================================================================================
""")


def main():
    parser = argparse.ArgumentParser(description="Verify email delivery pipeline")
    parser.add_argument(
        "--test",
        choices=["config", "direct", "service", "celery", "all"],
        default="config",
        help="Test to run (default: config)",
    )
    parser.add_argument(
        "--to",
        help="Email address to send test emails to",
    )

    args = parser.parse_args()

    if args.test != "config" and not args.to:
        print("Error: --to email address is required for delivery tests")
        sys.exit(1)

    print("\n" + "="*60)
    print(" BGCLive Email Delivery Verification")
    print(" " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)

    # Always check configuration
    config_results = check_configuration()
    print_results("Configuration Check", config_results)

    if not config_results["all_configured"]:
        print("\nError: Missing required configuration. Set environment variables:")
        print("  - RESEND_API_KEY")
        print("  - RESEND_FROM_EMAIL (optional, defaults to noreply@bgclive.com)")
        print("  - APP_URL (optional, defaults to http://localhost:3000)")
        sys.exit(1)

    if args.test == "config":
        print("\nConfiguration check passed!")
        sys.exit(0)

    # Direct API test
    if args.test in ("direct", "all"):
        direct_results = test_direct_api(args.to)
        print_results("Direct Resend API Test", direct_results)

    # Email service test
    if args.test in ("service", "all"):
        service_results = asyncio.run(test_email_service(args.to))
        print_results("Email Service Test", service_results)

    # Celery task test
    if args.test in ("celery", "all"):
        celery_results = test_celery_task(args.to)
        print_results("Celery Task Test", celery_results)

    # Print verification checklist
    if args.test == "all":
        print_checklist()

    # Summary
    print("\n" + "="*60)
    print(" Summary")
    print("="*60)

    if args.test in ("direct", "all"):
        status = "PASS" if direct_results.get("success") else "FAIL"
        print(f"  Direct API:     [{status}]")

    if args.test in ("service", "all"):
        status = "PASS" if service_results.get("success") else "FAIL"
        print(f"  Email Service:  [{status}]")

    if args.test in ("celery", "all"):
        status = "PASS" if celery_results.get("success") else "FAIL"
        print(f"  Celery Task:    [{status}]")

    print("\n")


if __name__ == "__main__":
    main()
