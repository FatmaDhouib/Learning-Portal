"""Lessons router – CRUD for course lessons."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Lesson, Course, LessonProgress, Enrollment
from schemas import LessonCreate, LessonUpdate, LessonOut, LessonProgressOut, ProgressUpdate, MessageResponse
from auth import get_current_user, require_instructor

router = APIRouter()


@router.get("/course/{course_id}", response_model=List[LessonOut])
def get_lessons_for_course(
    course_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Return all lessons for a course. Locked content is masked for non-enrolled users."""
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id, Enrollment.user_id == user["id"]
    ).first()
    lessons = (
        db.query(Lesson)
        .filter(Lesson.course_id == course_id)
        .order_by(Lesson.order_index)
        .all()
    )
    # If not enrolled and not instructor, hide content of non-free lessons
    if not enrollment and user["role"] not in ("instructor", "admin"):
        for lesson in lessons:
            if not lesson.is_free:
                lesson.content = None
                lesson.video_url = None
    return lessons


@router.get("/{lesson_id}", response_model=LessonOut)
def get_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.post("", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
def create_lesson(
    data: LessonCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_instructor),
):
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.instructor_id != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not your course")

    lesson = Lesson(**data.model_dump())
    db.add(lesson)
    # Update total_lessons count
    course.total_lessons = db.query(Lesson).filter(Lesson.course_id == data.course_id).count() + 1
    db.commit()
    db.refresh(lesson)
    return lesson


@router.patch("/{lesson_id}", response_model=LessonOut)
def update_lesson(
    lesson_id: int,
    data: LessonUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_instructor),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", response_model=MessageResponse)
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_instructor),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.delete(lesson)
    db.commit()
    return {"message": "Lesson deleted"}


# ─────────────────────────────────────────
# Progress tracking
# ─────────────────────────────────────────
@router.post("/progress", response_model=LessonProgressOut)
def update_progress(
    data: ProgressUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    progress = db.query(LessonProgress).filter(
        LessonProgress.user_id == user["id"],
        LessonProgress.lesson_id == data.lesson_id,
    ).first()

    if progress:
        progress.is_completed = data.is_completed
        progress.watched_secs = data.watched_secs
    else:
        lesson = db.query(Lesson).filter(Lesson.id == data.lesson_id).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        progress = LessonProgress(
            user_id=user["id"],
            lesson_id=data.lesson_id,
            course_id=lesson.course_id,
            is_completed=data.is_completed,
            watched_secs=data.watched_secs,
        )
        db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress


@router.get("/progress/{course_id}", response_model=List[LessonProgressOut])
def get_course_progress(
    course_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    return db.query(LessonProgress).filter(
        LessonProgress.user_id == user["id"],
        LessonProgress.course_id == course_id,
    ).all()
