"""
Course Service — FastAPI application entry point.
Handles courses, lessons, enrollments, progress, and reviews.
Port: 8001
"""
import os
import redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import courses, lessons, enrollments, categories

# ── Create all tables (if not already created by init.sql) ──────────────────
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Course Service",
    description="Learning Platform – Course management microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Redis client (shared across routers via app.state) ──────────────────────
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
app.state.redis = redis.from_url(REDIS_URL, decode_responses=True)

# ── Include routers ──────────────────────────────────────────────────────────
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(courses.router,    prefix="/courses",    tags=["Courses"])
app.include_router(lessons.router,    prefix="/lessons",    tags=["Lessons"])
app.include_router(enrollments.router,prefix="/enrollments",tags=["Enrollments"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "course-service"}
