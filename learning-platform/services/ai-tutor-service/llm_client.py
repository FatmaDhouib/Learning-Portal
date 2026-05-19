"""
Local LLM API client wrapper (Ollama).
Manages chat sessions with Redis-backed conversation history.
Model: qwen2.5:0.5b (or as configured)
"""
import os
import json
import requests
from typing import List, Optional

OLLAMA_URL   = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b")
HISTORY_TTL  = 3600   # 1 hour session TTL in Redis
MAX_HISTORY  = 10     # messages to retain per session

SYSTEM_PROMPT = """You are an expert AI tutor for an online learning platform.
Your role is to:
1. Answer learner questions clearly and accurately based on the course context provided.
2. Generate quiz questions to test understanding.
3. Recommend related topics or courses.
4. Encourage learners with positive, supportive language.

Guidelines:
- Be concise but thorough. Use examples when helpful.
- If you don't know something, say so rather than guessing.
- Format code examples with markdown code blocks.
- For quizzes, always provide 4 options (A–D) and mark the correct answer.
"""


class LocalTutor:
    def __init__(self, redis_client):
        self.api_base = f"{OLLAMA_URL}/api/chat"
        self.redis  = redis_client

    def _history_key(self, session_id: str) -> str:
        return f"ai_session:{session_id}"

    def _get_history(self, session_id: str) -> List[dict]:
        raw = self.redis.get(self._history_key(session_id))
        if raw:
            return json.loads(raw)
        return []

    def _save_history(self, session_id: str, history: List[dict]):
        # Keep only the last MAX_HISTORY messages to avoid context overflow
        trimmed = history[-MAX_HISTORY:]
        self.redis.setex(self._history_key(session_id), HISTORY_TTL, json.dumps(trimmed))

    def _call_ollama(self, messages: List[dict], temperature: float = 0.7) -> str:
        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        try:
            response = requests.post(self.api_base, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")
        except Exception as e:
            print(f"Error calling Ollama API: {e}")
            return "I'm sorry, I'm currently unavailable. Please try again later."

    def ask(
        self,
        question: str,
        session_id: str,
        course_context: Optional[str] = None,
    ) -> str:
        """
        Ask a question. Maintains multi-turn conversation history per session.
        course_context: optional text (lesson/course summary) for grounding.
        """
        history = self._get_history(session_id)

        # Build system message with optional context
        system = SYSTEM_PROMPT
        if course_context:
            system += f"\n\nCurrent course context:\n{course_context[:2000]}"

        user_message = {"role": "user", "content": question}
        messages = [{"role": "system", "content": system}] + history + [user_message]

        answer = self._call_ollama(messages, temperature=0.7)

        # Persist conversation
        history.append(user_message)
        history.append({"role": "assistant", "content": answer})
        self._save_history(session_id, history)

        return answer

    def generate_quiz(self, topic: str, num_questions: int = 5) -> str:
        """Generate a quiz with multiple-choice questions on a topic."""
        prompt = f"""Generate a quiz about: "{topic}"

Create exactly {num_questions} multiple-choice questions.
For each question use this exact format:

**Q1. [Question text]**
A) [Option]
B) [Option]
C) [Option]
D) [Option]
✅ Correct answer: [Letter]) [Brief explanation]

Make questions progressively harder. Cover key concepts comprehensively."""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        return self._call_ollama(messages, temperature=0.5)

    def recommend_courses(self, user_interests: str, completed_topics: List[str]) -> str:
        """Generate personalized course recommendations."""
        completed = ", ".join(completed_topics) if completed_topics else "none yet"
        prompt = f"""A learner is interested in: {user_interests}
They have already learned about: {completed}

Recommend 3–5 specific topics or courses they should explore next.
For each recommendation:
- Give a clear title
- Explain why it's relevant (2–3 sentences)
- Suggest prerequisite knowledge needed
- Estimate time to complete (hours)

Format as a numbered list."""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
        return self._call_ollama(messages, temperature=0.6)

    def summarize_feedback(self, feedback_text: str) -> dict:
        """Analyze feedback sentiment and produce a short summary (used by n8n)."""
        prompt = f"""Analyze this learner feedback and respond in JSON only (no markdown, just raw JSON text):
{{
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "2-3 sentence summary",
  "key_issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}}

Feedback: "{feedback_text}" """

        messages = [{"role": "user", "content": prompt}]
        raw = self._call_ollama(messages, temperature=0.3).strip()
        
        # Clean up markdown code blocks if the model wrapped the JSON
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
        
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"sentiment": "neutral", "summary": raw, "key_issues": [], "suggestions": []}

    def clear_session(self, session_id: str):
        self.redis.delete(self._history_key(session_id))
