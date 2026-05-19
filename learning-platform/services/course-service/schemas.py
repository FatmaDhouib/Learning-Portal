"""Pydantic schemas for Course Service request/response validation."""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ─────────────────────────────────────────
# Category Schemas
# ─────────────────────────────────────────
class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# ─────────────────────────────────────────
# Lesson Schemas
# ─────────────────────────────────────────
class LessonBase(BaseModel):
    title: str
    slug: str
    content: Optional[str] = None
    video_url: Optional[str] = None
    duration: int = 0
    order_index: int = 0
    is_free: bool = False


class LessonCreate(LessonBase):
    course_id: int


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[int] = None
    order_index: Optional[int] = None
    is_free: Optional[bool] = None


class LessonOut(LessonBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course_id: int
    created_at: datetime


class LessonProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    lesson_id: int
    is_completed: bool
    watched_secs: int


# ─────────────────────────────────────────
# Course Schemas
# ─────────────────────────────────────────
class CourseBase(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    short_desc: Optional[str] = None
    category_id: Optional[int] = None
    price: Decimal = Decimal("0.00")
    is_free: bool = True
    level: str = "beginner"
    language: str = "en"
    tags: Optional[List[str]] = []
    thumbnail_url: Optional[str] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_desc: Optional[str] = None
    category_id: Optional[int] = None
    price: Optional[Decimal] = None
    is_free: Optional[bool] = None
    is_published: Optional[bool] = None
    level: Optional[str] = None
    tags: Optional[List[str]] = None
    thumbnail_url: Optional[str] = None


class CourseOut(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    instructor_id: str
    instructor_name: Optional[str]
    is_published: bool
    total_lessons: int
    total_duration: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None


class CourseListOut(BaseModel):
    """Lightweight schema for catalogue listing."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    slug: str
    short_desc: Optional[str]
    thumbnail_url: Optional[str]
    level: str
    is_free: bool
    price: Decimal
    total_lessons: int
    total_duration: int
    instructor_name: Optional[str]
    category: Optional[CategoryOut] = None
    tags: Optional[List[str]] = []


# ─────────────────────────────────────────
# Enrollment Schemas
# ─────────────────────────────────────────
class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: str
    course_id: int
    enrolled_at: datetime
    is_completed: bool
    completed_at: Optional[datetime] = None


class ProgressUpdate(BaseModel):
    lesson_id: int
    is_completed: bool
    watched_secs: int = 0


# ─────────────────────────────────────────
# Review Schemas
# ─────────────────────────────────────────
class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: str
    course_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime


# ─────────────────────────────────────────
# Generic / Pagination
# ─────────────────────────────────────────
class PaginatedCourses(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[CourseListOut]


class MessageResponse(BaseModel):
    message: str
