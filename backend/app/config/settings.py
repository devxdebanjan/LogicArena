"""Application settings loaded from environment variables"""

from __future__ import annotations

from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlunparse, urlparse

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "LogicArena"
    APP_ENV: str = "development"
    APP_VERSION: str = "0.1.0"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: SecretStr

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def validate_database_url(cls, v: SecretStr) -> SecretStr:
        url_str = v.get_secret_value()
        parsed = urlparse(url_str)
        scheme = parsed.scheme
        if scheme in ("postgresql", "postgres"):
            scheme = "postgresql+asyncpg"
        
        query_params = parse_qsl(parsed.query)
        new_params = []
        for k, v_param in query_params:
            if k == "sslmode":
                new_params.append(("ssl", v_param))
            elif k == "channel_binding":
                continue
            else:
                new_params.append((k, v_param))
                
        new_query = urlencode(new_params)
        parsed = parsed._replace(scheme=scheme, query=new_query)
        return SecretStr(urlunparse(parsed))

    REDIS_URL: SecretStr

    JWT_SECRET_KEY: SecretStr
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    GUEST_CLEANUP_DAYS: int = 45
    GOOGLE_CLIENT_ID: str = ""

    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV.lower() == "development"


@lru_cache
def get_settings() -> Settings:
    """Cached settings factory"""
    return Settings()  # type: ignore[call-arg]


settings: Settings = get_settings()
