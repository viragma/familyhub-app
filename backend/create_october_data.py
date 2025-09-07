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

def main():
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        # Get users
        users = session.query(User).all()
        if not users:
            print("No users found!")
            return
        
        # Get templates
        templates = session.query(ShiftTemplate).all()
        if not templates:
            print("No templates found!")
            return
        
        print(f"Found {len(users)} users and {len(templates)} templates")
        
        # October 2025 dates
        october_dates = [
            datetime.date(2025, 10, 1),  # Wednesday
            datetime.date(2025, 10, 2),  # Thursday
            datetime.date(2025, 10, 3),  # Friday
            datetime.date(2025, 10, 6),  # Monday
            datetime.date(2025, 10, 7),  # Tuesday
            datetime.date(2025, 10, 8),  # Wednesday
            datetime.date(2025, 10, 9),  # Thursday
            datetime.date(2025, 10, 10), # Friday
            datetime.date(2025, 10, 13), # Monday
            datetime.date(2025, 10, 14), # Tuesday
            datetime.date(2025, 10, 15), # Wednesday
            datetime.date(2025, 10, 16), # Thursday
            datetime.date(2025, 10, 17), # Friday
            datetime.date(2025, 10, 20), # Monday
            datetime.date(2025, 10, 21), # Tuesday
            datetime.date(2025, 10, 22), # Wednesday
            datetime.date(2025, 10, 23), # Thursday
            datetime.date(2025, 10, 24), # Friday
        ]
        
        # Create assignments for multiple users
        assignments_created = 0
        
        for i, date in enumerate(october_dates):
            # Alternate between users
            user = users[i % len(users)]
            template = templates[i % len(templates)]
            
            # Check if assignment already exists
            existing = session.query(ShiftAssignment).filter(
                ShiftAssignment.user_id == user.id,
                ShiftAssignment.date == date
            ).first()
            
            if not existing:
                assignment = ShiftAssignment(
                    user_id=user.id,
                    template_id=template.id,
                    date=date,
                    status="scheduled"
                )
                session.add(assignment)
                assignments_created += 1
                print(f"Created assignment: User {user.id} - {template.name} on {date}")
            else:
                print(f"Assignment already exists for user {user.id} on {date}")
        
        # Commit all changes
        session.commit()
        print(f"\nCreated {assignments_created} October assignments!")
        
        # Show all assignments
        all_assignments = session.query(ShiftAssignment).order_by(ShiftAssignment.date).all()
        print(f"\nAll shift assignments ({len(all_assignments)}):")
        for assignment in all_assignments:
            template = session.query(ShiftTemplate).filter(ShiftTemplate.id == assignment.template_id).first()
            template_name = template.name if template else "Unknown"
            print(f"- ID: {assignment.id}, User: {assignment.user_id}, Template: {assignment.template_id} ({template_name}), Date: {assignment.date}, Status: {assignment.status}")
    
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main()
