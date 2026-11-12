from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_base_dir = Path(__file__).resolve().parent.parent.parent
_env_files = [
    str(_base_dir / ".env"),
    str(_base_dir.parent / ".env"),
    ".env",
]

class Settings(BaseSettings):
    APP_NAME: str = "MergeGuard"
    APP_VERSION: str = "1.0.0"
    GITHUB_WEBHOOK_SECRET: str = ""
    DATABASE_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=_env_files,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
