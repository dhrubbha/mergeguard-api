from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME : str = "MergeGuard"

    APP_VERSION: str = "1.0.0"

    GITHUB_WEBHOOK_SECRET: str =""

    DATABASE_URL: str = ""


    model_config = SettingsConfigDict (
        env_file = ".env",
        env_file_encoding = "utf-8",
        case_sensitive = False

    )


settings=Settings()
