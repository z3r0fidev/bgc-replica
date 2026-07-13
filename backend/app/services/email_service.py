import resend
from app.core.config import settings


class EmailService:
    """Service for sending emails via Resend."""

    def __init__(self):
        resend.api_key = settings.RESEND_API_KEY

    async def send_verification_email(
        self, to_email: str, token: str, user_name: str | None = None
    ) -> bool:
        """
        Send email verification email to user.

        Args:
            to_email: Recipient email address
            token: Plain verification token
            user_name: Optional user name for personalization

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not settings.RESEND_API_KEY:
            # Skip sending in development if no API key configured
            return False

        verification_url = f"{settings.APP_URL}/verify-email?token={token}"
        greeting = f"Hi {user_name}," if user_name else "Hi,"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    {greeting}
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Thank you for signing up for BGCLive! Please verify your email address by clicking the button below.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}"
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white;
                              padding: 14px 30px;
                              text-decoration: none;
                              border-radius: 8px;
                              font-weight: 600;
                              display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                    If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                    {verification_url}
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px;">
                    This link will expire in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.
                    If you didn't create an account, you can safely ignore this email.
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
{greeting}

Thank you for signing up for BGCLive! Please verify your email address by clicking the link below:

{verification_url}

This link will expire in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.

If you didn't create an account, you can safely ignore this email.

- The BGCLive Team
"""

        try:
            resend.Emails.send(
                {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [to_email],
                    "subject": "Verify your email for BGCLive",
                    "html": html_content,
                    "text": text_content,
                }
            )
            return True
        except Exception as e:
            print(f"Failed to send verification email: {e}")
            return False

    async def send_password_reset_email(
        self, to_email: str, token: str, user_name: str | None = None
    ) -> bool:
        """
        Send password reset email to user.

        Args:
            to_email: Recipient email address
            token: Plain reset token
            user_name: Optional user name for personalization

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not settings.RESEND_API_KEY:
            return False

        reset_url = f"{settings.APP_URL}/reset-password?token={token}"
        greeting = f"Hi {user_name}," if user_name else "Hi,"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    {greeting}
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}"
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white;
                              padding: 14px 30px;
                              text-decoration: none;
                              border-radius: 8px;
                              font-weight: 600;
                              display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                    If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                    {reset_url}
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px;">
                    This link will expire in {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hour(s).
                    If you didn't request a password reset, you can safely ignore this email.
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
{greeting}

We received a request to reset your password. Click the link below to create a new password:

{reset_url}

This link will expire in {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hour(s).

If you didn't request a password reset, you can safely ignore this email.

- The BGCLive Team
"""

        try:
            resend.Emails.send(
                {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [to_email],
                    "subject": "Reset your BGCLive password",
                    "html": html_content,
                    "text": text_content,
                }
            )
            return True
        except Exception as e:
            print(f"Failed to send password reset email: {e}")
            return False

    async def send_warning_email(
        self,
        to_email: str,
        reason: str,
        warning_count: int,
        threshold: int,
        escalated: bool,
        user_name: str | None = None,
    ) -> bool:
        """
        Send a moderation warning email to a user, notifying them of the
        reason and where they stand relative to the escalation threshold.

        Args:
            to_email: Recipient email address
            reason: Reason the warning was issued
            warning_count: This user's current active warning count (including this one)
            threshold: Number of active warnings that triggers automatic suspension
            escalated: Whether this warning pushed the user over the threshold
            user_name: Optional user name for personalization

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not settings.RESEND_API_KEY:
            return False

        greeting = f"Hi {user_name}," if user_name else "Hi,"
        support_url = f"{settings.APP_URL}/support"

        if escalated:
            subject = "Your BGCLive account has been suspended"
            heading = "Account Suspended"
            consequence_html = f"""
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    This warning brought your account to <strong>{warning_count} of {threshold}</strong> active warnings,
                    which has resulted in a temporary suspension of your account.
                </p>
            """
            consequence_text = (
                f"This warning brought your account to {warning_count} of {threshold} "
                "active warnings, which has resulted in a temporary suspension of your account."
            )
        else:
            subject = "You have received a warning on BGCLive"
            heading = "Account Warning"
            consequence_html = f"""
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    This is warning <strong>{warning_count} of {threshold}</strong>. Reaching {threshold} active
                    warnings will result in a temporary suspension of your account.
                </p>
            """
            consequence_text = (
                f"This is warning {warning_count} of {threshold}. Reaching {threshold} active "
                "warnings will result in a temporary suspension of your account."
            )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">{heading}</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    {greeting}
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    A moderator has issued you a warning for the following reason:
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; background: #f9fafb; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #764ba2;">
                    {reason}
                </p>
                {consequence_html}
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                    If you believe this warning was issued in error, you can reach out via
                    <a href="{support_url}" style="color: #667eea;">our support page</a>.
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
{greeting}

A moderator has issued you a warning for the following reason:

{reason}

{consequence_text}

If you believe this warning was issued in error, contact support: {support_url}

- The BGCLive Team
"""

        try:
            resend.Emails.send(
                {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                }
            )
            return True
        except Exception as e:
            print(f"Failed to send warning email: {e}")
            return False


email_service = EmailService()
