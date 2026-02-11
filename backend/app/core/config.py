from pydantic_settings import BaseSettings, SettingsConfigDict


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
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

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
    APP_URL: str = "http://localhost:3000"
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
