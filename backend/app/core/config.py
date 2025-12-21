from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEBUG: bool = False
    
    NEXTAUTH_SECRET: str = ""
    SENTRY_DSN: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    MEDIA_BUCKET_NAME: str = "bgclive-media"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
