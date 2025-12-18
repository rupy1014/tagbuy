"""Application configuration"""
import json
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class InstagramAccount(BaseSettings):
    """Instagram account configuration"""
    username: str
    password: str
    proxy: Optional[str] = None


class Settings(BaseSettings):
    """Application settings"""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Environment
    environment: str = "development"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tagbuy"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Security
    secret_key: str = "your-super-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"

    # Instagram
    instagram_accounts: str = "[]"
    instagram_min_request_interval: float = 2.0  # seconds
    instagram_max_requests_per_minute: int = 20

    # Bootpay
    bootpay_application_id: Optional[str] = None
    bootpay_private_key: Optional[str] = None

    # Paths
    sessions_dir: str = "sessions"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def get_instagram_accounts(self) -> List[InstagramAccount]:
        """Parse Instagram accounts from JSON string"""
        try:
            accounts_data = json.loads(self.instagram_accounts)
            return [InstagramAccount(**acc) for acc in accounts_data]
        except (json.JSONDecodeError, TypeError):
            return []


settings = Settings()
