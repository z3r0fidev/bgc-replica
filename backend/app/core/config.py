import re

from pydantic_settings import BaseSettings, SettingsConfigDict

# Ephemeral Vercel preview deployments get a unique origin per build
# (e.g. https://bgc-replica-lu17s1ndp-open-logic-distribution.vercel.app),
# so a static CORS_ORIGINS allowlist can never include them. Match the
# project's preview URL naming convention instead of widening to all of
# *.vercel.app.
VERCEL_PREVIEW_ORIGIN_PATTERN = re.compile(
    r"^https://bgc-replica-[a-z0-9]+-open-logic-distribution\.vercel\.app$"
)


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEBUG: bool = False

    # CORS configuration - comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS into a list of origins."""
        return [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]

    def is_allowed_origin(self, origin: str) -> bool:
        """Check an Origin header against the static allowlist plus Vercel previews."""
        if not origin:
            return False
        if origin in self.cors_origins_list:
            return True
        return bool(VERCEL_PREVIEW_ORIGIN_PATTERN.match(origin))

    NEXTAUTH_SECRET: str = ""
    SENTRY_DSN: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    MEDIA_BUCKET_NAME: str = "bgclive-media"

    # Email Verification (Resend)
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "noreply@bgclive.com"
    # Signing secret for the Resend webhook (Svix-based), from the Resend
    # dashboard's webhook settings once the endpoint is registered. Empty by
    # default so the webhook route can reject all requests (rather than
    # silently accept unsigned ones) until it's actually configured.
    RESEND_WEBHOOK_SECRET: str = ""
    APP_URL: str = "http://localhost:3000"
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1

    # Cache TTLs (in seconds)
    PROFILE_CACHE_TTL: int = 3600  # 1 hour
    FRIENDSHIP_CACHE_TTL: int = 600  # 10 minutes
    BLOCK_IDS_CACHE_TTL: int = 300  # 5 minutes

    # Moderation: warning escalation
    WARNING_ESCALATION_THRESHOLD: int = 3
    WARNING_ESCALATION_SUSPEND_HOURS: int = 168  # 7 days

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()  # type: ignore[call-arg]
