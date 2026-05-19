"""SQLAlchemy ORM models for Course Service."""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Numeric,
    ARRAY, TIMESTAMP, ForeignKey, SmallInteger, func
)
from sqlalchemy.orm import relationship
from database import Base


class Category(Base):
    __tablename__ = "categories"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), unique=True, nullable=False)
    slug        = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())

    courses = relationship("Course", back_populates="category")


class Course(Base):
    __tablename__ = "courses"

    id              = Column(Integer, primary_key=True, index=True)
    title           = Column(String(255), nullable=False)
    slug            = Column(String(255), unique=True, nullable=False)
    description     = Column(Text)
    short_desc      = Column(String(500))
    category_id     = Column(Integer, ForeignKey("categories.id"), nullable=True)
    instructor_id   = Column(String(100), nullable=False)
    instructor_name = Column(String(150))
    price           = Column(Numeric(10, 2), default=0.00)
    is_free         = Column(Boolean, default=True)
    is_published    = Column(Boolean, default=False)
    thumbnail_url   = Column(Text)
    level           = Column(String(50), default="beginner")
    language        = Column(String(10), default="en")
    tags            = Column(ARRAY(String))
    total_lessons   = Column(Integer, default=0)
    total_duration  = Column(Integer, default=0)
    created_at      = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at      = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    category    = relationship("Category", back_populates="courses")
    lessons     = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    reviews     = relationship("Review", back_populates="course", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id          = Column(Integer, primary_key=True, index=True)
    course_id   = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title       = Column(String(255), nullable=False)
    slug        = Column(String(255), nullable=False)
    content     = Column(Text)
    video_url   = Column(Text)
    duration    = Column(Integer, default=0)
    order_index = Column(Integer, default=0)
    is_free     = Column(Boolean, default=False)
    created_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at  = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    course = relationship("Course", back_populates="lessons")
    progress = relationship("LessonProgress", back_populates="lesson", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(String(100), nullable=False, index=True)
    course_id    = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    enrolled_at  = Column(TIMESTAMP(timezone=True), server_default=func.now())
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    is_completed = Column(Boolean, default=False)

    course = relationship("Course", back_populates="enrollments")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(String(100), nullable=False, index=True)
    lesson_id    = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    course_id    = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    is_completed = Column(Boolean, default=False)
    watched_secs = Column(Integer, default=0)
    updated_at   = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    lesson = relationship("Lesson", back_populates="progress")


class Review(Base):
    __tablename__ = "reviews"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(String(100), nullable=False)
    course_id  = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    rating     = Column(SmallInteger, nullable=False)
    comment    = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="reviews")
