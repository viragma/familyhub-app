from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Egyetlen nagy adatszerkezet a teljes dashboardhoz
dashboard_data = {
    "balance": {
        "amount": 48725,
        "change_percent": 12.5,
    },
    "stats": {
        "income": 650000,
        "expense": 420000,
        "savings": 230000,
        "goals_progress": 78,
    },
    "goal": {
        "name": "Nyaralás Alap",
        "current": 320000,
        "target": 500000,
    },
    "tasks": [
        { "id": 1, "title": 'Bevásárlás', "owner": 'Anya', "reward": '🎁 Pont', "done": False },
        { "id": 2, "title": 'Szoba rendrakás', "owner": 'Peti', "reward": '500 Ft', "done": True },
        { "id": 3, "title": 'Kutyasétáltatás', "owner": 'Anna', "reward": '300 Ft', "done": False },
        { "id": 4, "title": 'Autómosás', "owner": 'Senki', "reward": '1500 Ft', "done": False }
    ],
    "family": [
        { "id": 1, "name": 'Apa', "initial": 'A', "online": True, "color": 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
        { "id": 2, "name": 'Anya', "initial": 'E', "online": True, "color": 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' },
        { "id": 3, "name": 'Peti', "initial": 'P', "online": False, "color": 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' },
        { "id": 4, "name": 'Anna', "initial": 'A', "online": True, "color": 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }
    ],
    "shopping_list": {
        "items": [
            'Tej (2 liter)',
            'Kenyér',
            'Tojás (10 db)',
            'Alma (1 kg)'
        ],
        "estimated_cost": 8500
    }
}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Szia, a FamilyHub Backend fut!"}

# Az új, mindent visszaadó végpont
@app.get("/api/dashboard")
def get_dashboard_data():
    return dashboard_data

@app.post("/api/tasks/{task_id}/toggle")
def toggle_task_status(task_id: int):
    # Keressük meg a feladatot a listában
    task_found = None
    for task in dashboard_data['tasks']:
        if task['id'] == task_id:
            task_found = task
            break
    
    # Ha nem találtuk meg a feladatot, 404-es hibát dobunk
    if not task_found:
        raise HTTPException(status_code=404, detail="A feladat nem található")
    
    # Megfordítjuk a 'done' állapotot
    task_found['done'] = not task_found['done']
    
    # Visszaküldjük a frissített feladatot
    return task_found