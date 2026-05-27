import os
from dotenv import load_dotenv
from sqlalchemy.pool import NullPool

load_dotenv()

def parse_bool(value: str, default=False):
    if value is None:
        return default
    return value.lower() in ("1", "true", "yes", "s", "sim")

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_ENGINE_OPTIONS = {
        "poolclass": NullPool,
        "pool_pre_ping": True,
    }

    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_ACCESS_MINUTES = int(os.getenv("JWT_ACCESS_MINUTES", "30"))
    JWT_REFRESH_DAYS = int(os.getenv("JWT_REFRESH_DAYS", "7"))

    COOKIE_SECURE = parse_bool(os.getenv("COOKIE_SECURE"), False)
    COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None
    COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")

    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    CORS_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
