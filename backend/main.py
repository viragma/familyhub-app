from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .crud import get_tasks, create_task, toggle_task_status
from .models import Base, Task
from .schemas import Task as TaskSchema, TaskCreate
from .database import SessionLocal, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

with SessionLocal() as db:
    if db.query(Task).count() == 0:
        initial_tasks = [
            TaskCreate(title='Bevásárlás', owner='Anya', reward='🎁 Pont', done=False),
            TaskCreate(title='Szoba rendrakás', owner='Peti', reward='500 Ft', done=True),
            TaskCreate(title='Kutyasétáltatás', owner='Anna', reward='300 Ft', done=False),
            TaskCreate(title='Autómosás', owner='Senki', reward='1500 Ft', done=False)
        ]
        for task in initial_tasks:
            create_task(db=db, task=task)
        print("Adatbázis feltöltve kezdeti feladatokkal.")

@app.post("/api/tasks/{task_id}/toggle", response_model=TaskSchema)
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    db_task = toggle_task_status(db=db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="A feladat nem található")
    return db_task

@app.get("/api/tasks", response_model=list[TaskSchema])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tasks = get_tasks(db, skip=skip, limit=limit)
    return tasks

@app.post("/api/tasks/", response_model=TaskSchema)
def create_new_task(task: TaskCreate, db: Session = Depends(get_db)):
    return create_task(db=db, task=task)

@app.delete("/api/tasks/{task_id}", response_model=TaskSchema)
def remove_task(task_id: int, db: Session = Depends(get_db)):
    db_task = delete_task(db=db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="A feladat nem található")
    return db_task

@app.get("/api/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)):
    tasks_from_db = get_tasks(db)
    return {
         "balance": {"amount": 487250, "change_percent": 12.5},
         "stats": {"income": 650000, "expense": 420000, "savings": 230000, "goals_progress": 78},
         "goal": {"name": "Nyaralás Alap", "current": 320000, "target": 500000},
         "tasks": tasks_from_db,
         "family": [
            { "id": 1, "name": 'Apa', "initial": 'A', "online": True, "color": 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
            { "id": 2, "name": 'Anya', "initial": 'E', "online": True, "color": 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' },
            { "id": 3, "name": 'Peti', "initial": 'P', "online": False, "color": 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' },
            { "id": 4, "name": 'Anna', "initial": 'A', "online": True, "color": 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }
         ],
         "shopping_list": {
             "items": ['Tej (2 liter)','Kenyér','Tojás (10 db)','Alma (1 kg)'],
             "estimated_cost": 8500
         }
    }