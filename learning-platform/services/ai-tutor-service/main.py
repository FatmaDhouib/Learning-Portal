"""
AI Tutor Service — FastAPI.
Uses local Ollama for:
- Contextual Q&A with session memory
- Quiz generation
- Personalized course recommendations
- Feedback analysis (called by n8n)
Port: 8004
"""
import os
import uuid
import redis as redis_client
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from jose import jwt, JWTError
from llm_client import LocalTutor

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Tutor Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REDIS_URL  = os.getenv("REDIS_URL", "redis://localhost:6379/3")
JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "fallback-secret"))
ALGORITHM  = "HS256"

r = redis_client.from_url(REDIS_URL, decode_responses=True)
app.state.redis  = r
app.state.tutor  = LocalTutor(r)

# ── Auth ──────────────────────────────────────────────────────────────────────
bearer = HTTPBearer(auto_error=False)

def get_optional_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict | None:
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return {"id": payload.get("sub") or payload.get("id"), "role": payload.get("role", "student")}
    except JWTError:
        return None

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    user = get_optional_user(creds)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

# ── Schemas ───────────────────────────────────────────────────────────────────
class AskRequest(BaseModel):
    question:       str = Field(..., min_length=3, max_length=2000)
    session_id:     Optional[str] = None
    course_context: Optional[str] = None   # lesson content snippet for grounding

class AskResponse(BaseModel):
    answer:     str
    session_id: str

class QuizRequest(BaseModel):
    topic:         str = Field(..., min_length=3, max_length=500)
    num_questions: int = Field(5, ge=1, le=10)

class RecommendRequest(BaseModel):
    interests:        str
    completed_topics: List[str] = []

class FeedbackAnalysisRequest(BaseModel):
    feedback_text: str
    course_id:     Optional[int] = None
    user_id:       Optional[str] = None

class ClearSessionRequest(BaseModel):
    session_id: str

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health(): return {"status": "ok", "service": "ai-tutor-service", "model": os.getenv("OLLAMA_MODEL")}

@app.post("/ask", response_model=AskResponse)
def ask_question(
    data: AskRequest,
    user: dict = Depends(get_current_user),
):
    """
    Ask the AI Tutor a question. Multi-turn conversation is maintained
    via a session_id stored in Redis. If no session_id is provided,
    a new session is created.
    """
    session_id = data.session_id or f"{user['id']}:{uuid.uuid4().hex[:8]}"
    try:
        answer = app.state.tutor.ask(
            question=data.question,
            session_id=session_id,
            course_context=data.course_context,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
    return {"answer": answer, "session_id": session_id}


@app.post("/quiz")
def generate_quiz(data: QuizRequest, user: dict = Depends(get_current_user)):
    """Generate a multiple-choice quiz on any topic."""
    try:
        quiz_text = app.state.tutor.generate_quiz(data.topic, data.num_questions)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
    return {"topic": data.topic, "quiz": quiz_text}


@app.post("/recommend")
def recommend(data: RecommendRequest, user: dict = Depends(get_current_user)):
    """Get personalized course/topic recommendations."""
    try:
        recommendations = app.state.tutor.recommend_courses(data.interests, data.completed_topics)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
    return {"recommendations": recommendations}


@app.post("/analyze-feedback")
def analyze_feedback(data: FeedbackAnalysisRequest):
    """
    Analyze feedback text for sentiment and key insights.
    Called internally by the n8n automation workflow.
    No auth required (internal service call).
    """
    try:
        analysis = app.state.tutor.summarize_feedback(data.feedback_text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
    return {
        "course_id": data.course_id,
        "user_id": data.user_id,
        "analysis": analysis,
    }


@app.post("/session/clear")
def clear_session(data: ClearSessionRequest, user: dict = Depends(get_current_user)):
    """Clear a conversation session (start fresh)."""
    app.state.tutor.clear_session(data.session_id)
    return {"message": "Session cleared", "session_id": data.session_id}
