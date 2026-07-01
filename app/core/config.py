from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sentix"
    api_prefix: str = "/api"
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])
    # Override for local dev: set CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    # Production: keep as ["*"] (allow_credentials is auto-set to False when wildcard is present)

    rate_limit_max_requests: int = 60
    rate_limit_window_seconds: int = 60
    default_provider: str = "demo"
    default_model_name: str = "sentix-demo"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
