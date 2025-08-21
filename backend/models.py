from sqlalchemy import Boolean, Column, Integer, String
from .database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    owner = Column(String)
    reward = Column(String)
    done = Column(Boolean, default=False)