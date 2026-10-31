from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SubTrack"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "brightloop-super-secret-jwt-key-min-32-chars-long-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    DATABASE_URL: str = "sqlite:///./subtrack.db"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173"]

    ADMIN_EMAIL: str = "admin@brightloop.com"
    ADMIN_PASSWORD: str = "Admin@1234"
    ADMIN_NAME: str = "Admin Brightloop"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

