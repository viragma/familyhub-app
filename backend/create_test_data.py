#!/usr/bin/env python3

import sys
import os
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import database first
from database import SQLALCHEMY_DATABASE_URL, Base
from sqlalchemy import (
    Boolean, Column, Integer, String, Date, ForeignKey,
    Numeric, DateTime, Table, Enum, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Simple model definitions for this script
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    family_id = Column(Integer, ForeignKey("families.id"))

class ShiftTemplate(Base):
    __tablename__ = "shift_templates"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    location = Column(String, nullable=False, default="office")
    location_details = Column(String, nullable=True)
    color = Column(String, nullable=True, default="#3b82f6")
    description = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("shift_templates.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="scheduled")
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

# Create database connection
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_test_data():
    db = SessionLocal()
    
    try:
        # Get or create a test user
        user = db.query(User).first()
        if not user:
            print("No users found! Create a user first.")
            return
        
        print(f"Using user: {user.name} (ID: {user.id})")
        
        # Create a shift template if it doesn't exist
        existing_template = db.query(ShiftTemplate).filter(ShiftTemplate.name == "Reggeli műszak").first()
        
        if not existing_template:
            template = ShiftTemplate(
                user_id=user.id,
                name="Reggeli műszak",
                start_time="08:00",
                end_time="16:00",
                location="office",
                color="#3b82f6",
                description="Reggeli munkaidő",
                is_active=True
            )
            db.add(template)
            db.commit()
            db.refresh(template)
            print(f"Created shift template: {template.name} (ID: {template.id})")
        else:
            template = existing_template
            print(f"Using existing template: {template.name} (ID: {template.id})")
        
        # Create shift assignments for this week
        today = datetime.date.today()
        
        # Get Monday of this week
        monday = today - datetime.timedelta(days=today.weekday())
        
        # Create assignments for Monday, Wednesday, Friday
        for day_offset in [0, 2, 4]:  # Monday, Wednesday, Friday
            assignment_date = monday + datetime.timedelta(days=day_offset)
            
            # Check if assignment already exists
            existing = db.query(ShiftAssignment).filter(
                ShiftAssignment.template_id == template.id,
                ShiftAssignment.user_id == user.id,
                ShiftAssignment.date == assignment_date
            ).first()
            
            if not existing:
                assignment = ShiftAssignment(
                    user_id=user.id,
                    template_id=template.id,
                    date=assignment_date,
                    status="scheduled",
                    notes=f"Beosztás - {assignment_date.strftime('%Y-%m-%d')}"
                )
                db.add(assignment)
                print(f"Created assignment for {assignment_date}")
            else:
                print(f"Assignment already exists for {assignment_date}")
        
        db.commit()
        print("Test data creation completed!")
        
        # Show current assignments
        print("\nCurrent shift assignments:")
        assignments = db.query(ShiftAssignment).all()
        for assignment in assignments:
            print(f"- ID: {assignment.id}, User: {assignment.user_id}, Template: {assignment.template_id}, Date: {assignment.date}, Status: {assignment.status}")
        
    except Exception as e:
        print(f"Error creating test data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()
