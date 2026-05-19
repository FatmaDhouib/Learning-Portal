"""
JWT authentication middleware for Course Service.
Validates tokens issued by user-service.
"""
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

SECRET_KEY = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "fallback-secret"))
ALGORITHM  = "HS256"

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Decode and return the JWT payload. Raises 401 if invalid or missing."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub") or payload.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"id": user_id, "role": payload.get("role", "student"), "name": payload.get("name", "")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict | None:
    """Return user payload if token provided, else None (for public endpoints)."""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub") or payload.get("id")
        return {"id": user_id, "role": payload.get("role", "student"), "name": payload.get("name", "")}
    except JWTError:
        return None


def require_instructor(user: dict = Depends(get_current_user)) -> dict:
    """Allow only instructors and admins to proceed."""
    if user.get("role") not in ("instructor", "admin"):
        raise HTTPException(status_code=403, detail="Instructor or admin role required")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user
