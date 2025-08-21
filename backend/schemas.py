from pydantic import BaseModel

class TaskBase(BaseModel):
    title: str
    owner: str | None = None
    reward: str | None = None
    done: bool = False

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int

    class Config:
        from_attributes = True