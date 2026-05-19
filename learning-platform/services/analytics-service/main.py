"""
Analytics Service — FastAPI.
Tracks view events, enrollment events, and serves dashboard metrics.
Port: 8003
"""
import os
import json
import redis as redis_client
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, TIMESTAMP, BigInteger, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from pydantic import BaseModel
from jose import jwt, JWTError

# ── DB Setup ─────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lpuser:lppassword123@localhost:5432/learningplatform")
engine  = create_engine(DATABASE_URL, pool_pre_ping=True)
Session_ = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base    = declarative_base()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")
JWT_SECRET  = os.getenv("JWT_SECRET", SECRET_KEY)
ALGORITHM   = "HS256"

# ── Models ────────────────────────────────────────────────────────────────────
class ViewEvent(Base):
    __tablename__ = "view_events"
    id         = Column(BigInteger, primary_key=True)
    user_id    = Column(String(100))
    course_id  = Column(Integer)
    lesson_id  = Column(Integer)
    event_type = Column(String(50))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class EnrollmentEvent(Base):
    __tablename__ = "enrollment_events"
    id         = Column(BigInteger, primary_key=True)
    user_id    = Column(String(100))
    course_id  = Column(Integer)
    event_type = Column(String(50))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

Base.metadata.create_all(bind=engine)

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class TrackView(BaseModel):
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None
    event_type: str = "course_view"

class TrackEnrollment(BaseModel):
    course_id: int
    event_type: str = "enroll"   # enroll | complete

class DashboardStats(BaseModel):
    total_views: int
    total_enrollments: int
    total_completions: int
    enrollments_last_7_days: int
    top_courses: list

# ── Auth helpers ──────────────────────────────────────────────────────────────
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
bearer = HTTPBearer(auto_error=False)

def get_optional_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict | None:
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return {"id": payload.get("sub") or payload.get("id"), "role": payload.get("role", "student")}
    except JWTError:
        return None

def get_db():
    db = Session_()
    try:
        yield db
    finally:
        db.close()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Analytics Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/2")
app.state.redis = redis_client.from_url(REDIS_URL, decode_responses=True)

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health(): return {"status": "ok", "service": "analytics-service"}

@app.post("/track/view", status_code=204)
def track_view(data: TrackView, db: Session = Depends(get_db), user: dict = Depends(get_optional_user)):
    event = ViewEvent(
        user_id=user["id"] if user else None,
        course_id=data.course_id,
        lesson_id=data.lesson_id,
        event_type=data.event_type,
    )
    db.add(event)
    db.commit()

@app.post("/track/enrollment", status_code=204)
def track_enrollment(data: TrackEnrollment, db: Session = Depends(get_db), user: dict = Depends(get_optional_user)):
    event = EnrollmentEvent(
        user_id=user["id"] if user else "anonymous",
        course_id=data.course_id,
        event_type=data.event_type,
    )
    db.add(event)
    db.commit()

@app.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db)):
    cached = app.state.redis.get("analytics:dashboard")
    if cached:
        return json.loads(cached)

    total_views       = db.query(func.count(ViewEvent.id)).scalar() or 0
    total_enrollments = db.query(func.count(EnrollmentEvent.id)).filter(EnrollmentEvent.event_type == "enroll").scalar() or 0
    total_completions = db.query(func.count(EnrollmentEvent.id)).filter(EnrollmentEvent.event_type == "complete").scalar() or 0
    week_ago          = datetime.utcnow() - timedelta(days=7)
    enrollments_7d    = db.query(func.count(EnrollmentEvent.id)).filter(
        EnrollmentEvent.event_type == "enroll",
        EnrollmentEvent.created_at >= week_ago
    ).scalar() or 0

    top_raw = db.execute(text("""
        SELECT course_id, COUNT(*) as cnt
        FROM enrollment_events
        WHERE event_type = 'enroll'
        GROUP BY course_id
        ORDER BY cnt DESC
        LIMIT 5
    """)).fetchall()
    top_courses = [{"course_id": r[0], "enrollments": r[1]} for r in top_raw]

    result = {
        "total_views": total_views,
        "total_enrollments": total_enrollments,
        "total_completions": total_completions,
        "enrollments_last_7_days": enrollments_7d,
        "top_courses": top_courses,
    }
    app.state.redis.setex("analytics:dashboard", 60, json.dumps(result))
    return result

@app.get("/trends/enrollments")
def enrollment_trends(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.execute(text("""
        SELECT DATE(created_at) as day, COUNT(*) as count
        FROM enrollment_events
        WHERE event_type = 'enroll' AND created_at >= :since
        GROUP BY day ORDER BY day
    """), {"since": since}).fetchall()
    return [{"date": str(r[0]), "count": r[1]} for r in rows]

@app.get("/trends/views")
def view_trends(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.execute(text("""
        SELECT DATE(created_at) as day, COUNT(*) as count
        FROM view_events WHERE created_at >= :since
        GROUP BY day ORDER BY day
    """), {"since": since}).fetchall()
    return [{"date": str(r[0]), "count": r[1]} for r in rows]

@app.get("/courses/{course_id}/stats")
def course_stats(course_id: int, db: Session = Depends(get_db)):
    views       = db.query(func.count(ViewEvent.id)).filter(ViewEvent.course_id == course_id).scalar() or 0
    enrollments = db.query(func.count(EnrollmentEvent.id)).filter(
        EnrollmentEvent.course_id == course_id, EnrollmentEvent.event_type == "enroll").scalar() or 0
    completions = db.query(func.count(EnrollmentEvent.id)).filter(
        EnrollmentEvent.course_id == course_id, EnrollmentEvent.event_type == "complete").scalar() or 0
    return {"course_id": course_id, "views": views, "enrollments": enrollments, "completions": completions}
