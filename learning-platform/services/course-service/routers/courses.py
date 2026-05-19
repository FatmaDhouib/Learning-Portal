"""Courses router – CRUD, search, filtering, pagination."""
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import get_db
from models import Course, Category, Enrollment, Review
from schemas import (
    CourseCreate, CourseUpdate, CourseOut, CourseListOut,
    PaginatedCourses, ReviewCreate, ReviewOut, MessageResponse
)
from auth import get_current_user, get_optional_user, require_instructor

router = APIRouter()

CACHE_TTL = 300  # 5 minutes


def _cache_key(prefix: str, **kwargs) -> str:
    parts = "&".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
    return f"{prefix}:{parts}"


# ─────────────────────────────────────────
# GET /courses — paginated catalogue
# ─────────────────────────────────────────
@router.get("", response_model=PaginatedCourses)
def list_courses(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    category: Optional[int] = None,
    level: Optional[str] = None,
    is_free: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    cache_key = _cache_key("courses", page=page, size=page_size,
                            cat=category, lvl=level, free=is_free, q=search)
    cached = request.app.state.redis.get(cache_key)
    if cached:
        return json.loads(cached)

    query = db.query(Course).filter(Course.is_published == True)

    if category:
        query = query.filter(Course.category_id == category)
    if level:
        query = query.filter(Course.level == level)
    if is_free is not None:
        query = query.filter(Course.is_free == is_free)
    if search:
        query = query.filter(
            or_(
                Course.title.ilike(f"%{search}%"),
                Course.description.ilike(f"%{search}%"),
                Course.tags.any(search),
            )
        )

    total = query.count()
    courses = query.offset((page - 1) * page_size).limit(page_size).all()

    result = PaginatedCourses(
        total=total, page=page, page_size=page_size,
        items=[CourseListOut.model_validate(c) for c in courses]
    )
    request.app.state.redis.setex(cache_key, CACHE_TTL, result.model_dump_json())
    return result


# ─────────────────────────────────────────
# GET /courses/:id
# ─────────────────────────────────────────
@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


# ─────────────────────────────────────────
# GET /courses/slug/:slug
# ─────────────────────────────────────────
@router.get("/slug/{slug}", response_model=CourseOut)
def get_course_by_slug(slug: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.slug == slug).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


# ─────────────────────────────────────────
# POST /courses — create (instructor only)
# ─────────────────────────────────────────
@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_instructor),
):
    existing = db.query(Course).filter(Course.slug == data.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Slug already in use")

    course = Course(
        **data.model_dump(),
        instructor_id=user["id"],
        instructor_name=user.get("name", ""),
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


# ─────────────────────────────────────────
# PATCH /courses/:id — update
# ─────────────────────────────────────────
@router.patch("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    data: CourseUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_instructor),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.instructor_id != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not your course")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


# ─────────────────────────────────────────
# DELETE /courses/:id
# ─────────────────────────────────────────
@router.delete("/{course_id}", response_model=MessageResponse)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_instructor),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.instructor_id != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not your course")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}


# ─────────────────────────────────────────
# Reviews
# ─────────────────────────────────────────
@router.get("/{course_id}/reviews", response_model=List[ReviewOut])
def get_reviews(course_id: int, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.course_id == course_id).all()


@router.post("/{course_id}/reviews", response_model=ReviewOut, status_code=201)
def add_review(
    course_id: int,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    existing = db.query(Review).filter(
        Review.course_id == course_id, Review.user_id == user["id"]
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already reviewed this course")

    review = Review(user_id=user["id"], course_id=course_id, **data.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
