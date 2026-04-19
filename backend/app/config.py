from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@db:5432/melioredge_budget"

    # Must match dashboard so handoff tokens validate
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SESSION_ABSOLUTE_HOURS: int = 12

    ALLOWED_ORIGINS: str = "http://localhost:3005,http://localhost:3002"
    ENVIRONMENT: str = "development"

    COOKIE_ACCESS_NAME: str = "mel_budget_access"
    COOKIE_DOMAIN: str = ""
    COOKIE_SAMESITE: str = "lax"
    COOKIE_SECURE: bool = False
    COOKIE_PATH: str = "/"

    APP_ID: str = "budget"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def cookie_kwargs(self) -> dict:
        kwargs = {
            "httponly": True,
            "secure": self.COOKIE_SECURE or self.ENVIRONMENT == "production",
            "samesite": self.COOKIE_SAMESITE,
            "path": self.COOKIE_PATH,
        }
        if self.COOKIE_DOMAIN:
            kwargs["domain"] = self.COOKIE_DOMAIN
        return kwargs

    class Config:
        env_file = ".env"


settings = Settings()
