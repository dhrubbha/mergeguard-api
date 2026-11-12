from urllib.parse import unquote
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from backend.app.config import settings


DATABASE_URL = unquote(settings.DATABASE_URL) if settings.DATABASE_URL else ""

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


class Base(DeclarativeBase):
    pass

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()