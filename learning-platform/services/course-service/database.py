"""
Database configuration for Course Service.
Uses SQLAlchemy 2.0 async engine with PostgreSQL.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lpuser:lppassword123@localhost:5432/learningplatform")

# Sync engine (simpler for this service; switch to asyncpg for high load)
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency injection: yield a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
