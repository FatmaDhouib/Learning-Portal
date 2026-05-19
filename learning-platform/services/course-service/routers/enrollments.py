"""Enrollments router."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Enrollment, Course
from schemas import EnrollmentOut, MessageResponse
from auth import get_current_user

router = APIRouter()


@router.post("/{course_id}", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def enroll(
    course_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Enroll the authenticated user in a course."""
    course = db.query(Course).filter(Course.id == course_id, Course.is_published == True).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = db.query(Enrollment).filter(
        Enrollment.user_id == user["id"],
        Enrollment.course_id == course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already enrolled")

    enrollment = Enrollment(user_id=user["id"], course_id=course_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.delete("/{course_id}", response_model=MessageResponse)
def unenroll(
    course_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user["id"],
        Enrollment.course_id == course_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    db.delete(enrollment)
    db.commit()
    return {"message": "Unenrolled successfully"}


@router.get("/my", response_model=List[EnrollmentOut])
def my_enrollments(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    return db.query(Enrollment).filter(Enrollment.user_id == user["id"]).all()


@router.get("/check/{course_id}")
def check_enrollment(
    course_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user["id"],
        Enrollment.course_id == course_id,
    ).first()
    return {"enrolled": enrollment is not None}
