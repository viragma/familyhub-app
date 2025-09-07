from fastapi import FastAPI, Depends, HTTPException, status, Form, Body, Query, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .scheduler import scheduler
from sqlalchemy import func, extract, and_, or_
from datetime import datetime, timedelta, date
from typing import Optional, List
from fastapi import Query
from contextlib import asynccontextmanager
import os
import uuid
import shutil
from pathlib import Path


from . import crud
from .crud import (
    get_tasks, create_task, toggle_task_status, delete_task,
    create_family, create_user, get_user, update_user,
    delete_user as crud_delete_user, get_users_by_family,
    create_family_account, get_accounts_by_family, create_account_transaction,
    create_category, get_categories,get_transactions,update_transaction, delete_transaction,
    create_transfer,get_all_personal_accounts,get_financial_summary,update_category, delete_category,update_account, delete_account,get_account,
    update_account_viewer,create_recurring_rule,get_all_transfer_targets,get_valid_transfer_targets,get_recurring_rules, update_recurring_rule, delete_recurring_rule,
    toggle_rule_status,get_dashboard_goals,delete_account_with_dependencies,get_categories_tree,get_category_spending_analytics,get_savings_trend_analytics,get_detailed_category_analytics,get_detailed_savings_analytics,
    # Új importok
    get_expected_expenses, create_expected_expense, update_expected_expense,
    delete_expected_expense, complete_expected_expense,
    create_account_transaction,get_next_month_forecast,get_upcoming_events,
    create_wish, get_wishes_by_family, get_wish, update_wish, delete_wish,
    submit_wish_for_approval,process_wish_approval,
    get_dashboard_notifications,
    get_wish_history, create_and_submit_wish,close_goal_account,
    get_dashboard_data,
    # Time Management imports
    create_work_shift, get_user_shifts, get_family_shifts, update_work_shift, delete_work_shift,
    create_shift_template, get_user_shift_templates, get_family_shift_templates, update_shift_template, delete_shift_template,
    create_shift_assignment, get_user_shift_assignments, get_family_shift_assignments, update_shift_assignment, delete_shift_assignment,
    get_monthly_schedule,
    create_calendar_integration, get_user_calendar_integrations, update_calendar_integration, delete_calendar_integration,
    create_time_conflict, get_family_conflicts, resolve_time_conflict, snooze_time_conflict,
    create_family_event, get_family_events, get_todays_events, update_family_event, delete_family_event,
    update_user_status, get_family_status, get_dashboard_time_data
)
from .models import Base, Task, User as UserModel, Category as CategoryModel
from . import models, schemas
from .schemas import (
    Task as TaskSchema, TaskCreate,
    Family, FamilyCreate,
    User, UserCreate, UserUpdate, UserProfile,
    Account, Transaction, TransactionCreate, AccountCreate,
    Category as CategorySchema, CategoryCreate,TransferCreate, # CategoryCreate importálva
    RecurringRule, RecurringRuleCreate,
    # Új importok
    ExpectedExpense as ExpectedExpenseSchema, ExpectedExpenseCreate,
    ExpectedExpenseComplete,
    Transaction as TransactionSchema, TransactionCreate,UpcomingEvent,
    Wish as WishSchema, WishCreate,
    WishApproval as WishApprovalSchema, WishApprovalCreate,
    Notification,
    WishHistory as WishHistorySchema,
    WishActivationRequest,
    GoalCloseRequest,
    DashboardResponse,
    UserSettings, UserSettingsCreate, UserSettingsUpdate,
    UserEvent, UserEventCreate, UserEventUpdate,
    UserStatusHistory, UserStatusHistoryCreate,
    # Time Management schemas
    WorkShift, WorkShiftCreate, WorkShiftUpdate,
    ShiftTemplate, ShiftTemplateCreate, ShiftTemplateUpdate,
    ShiftAssignment, ShiftAssignmentCreate, ShiftAssignmentUpdate,
    MonthlySchedule, MonthlyScheduleEntry,
    CalendarIntegration, CalendarIntegrationCreate, CalendarIntegrationUpdate,
    TimeConflict, TimeConflictCreate, TimeConflictUpdate,
    FamilyEvent, FamilyEventCreate, FamilyEventUpdate,
    UserStatusUpdate, DashboardTimeData
)
from .database import SessionLocal, engine
from .security import create_access_token, verify_pin, oauth2_scheme, SECRET_KEY, ALGORITHM
from jose import JWTError, jwt

# Base.metadata.create_all(bind=engine) # Handled by Alembic
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Induláskor
    print("Időzítő indítása...")
    scheduler.start()
    yield
    # Leálláskor
    print("Időzítő leállítása...")
    scheduler.shutdown()
app = FastAPI(lifespan=lifespan)

origins = ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Statikus fájlok kiszolgálása
from fastapi.responses import FileResponse

@app.get("/uploads/avatars/{filename}")
async def get_avatar(filename: str):
    file_path = Path(f"/home/viragma/familyhub-app/uploads/avatars/{filename}")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fájl nem található")
    return FileResponse(file_path)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()




def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None: raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(db, user_id=int(user_id))
    if user is None: raise credentials_exception
    return user

def get_current_admin_user(current_user: UserModel = Depends(get_current_user)):
    if current_user.role != "Családfő":
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a művelethez!")
    return current_user

@app.post("/api/families", response_model=Family)
def add_family(family: FamilyCreate, db: Session = Depends(get_db)):
    return create_family(db=db, family=family)

@app.post("/api/users/setup-admin", response_model=User)
def setup_admin_user(user: UserCreate, db: Session = Depends(get_db)):
    # Ellenőrizzük, hogy létezik-e a család
    existing_family = db.query(models.Family).filter(models.Family.id == user.family_id).first()
    if not existing_family:
        raise HTTPException(status_code=400, detail="Family not found")
    
    # Létrehozzuk az admin felhasználót
    new_user = create_user(db=db, user=user)
    
    if new_user:
        # Létrehozzuk a "Közös Kasszát"
        account_schema = AccountCreate(name="Közös Kassza", type="közös")
        create_family_account(db=db, account=account_schema, family_id=new_user.family_id, owner_user=new_user)
        
    return new_user

@app.post("/api/login")
def login_for_access_token(user_id: int = Form(...), pin: str = Form(...), db: Session = Depends(get_db)):

    user = get_user(db, user_id=user_id)
    if not user or not verify_pin(pin, user.pin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Hibás felhasználói azonosító vagy PIN kód", headers={"WWW-Authenticate": "Bearer"})
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/api/users/me", response_model=User)
def read_users_me(current_user: UserModel = Depends(get_current_user)):
    return current_user

@app.get("/api/families/{family_id}/users", response_model=list[UserProfile])
def read_family_users(family_id: int, db: Session = Depends(get_db)):
    return get_users_by_family(db=db, family_id=family_id)
    
@app.put("/api/users/{user_id}", response_model=User)
def update_user_details(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    # Only allow users to update their own profile or admin to update any
    if current_user.id != user_id and current_user.role != 'Családfő':
        raise HTTPException(status_code=403, detail="Nincs jogosultságod ehhez a művelethez")
    
    return update_user(db=db, user_id=user_id, user_data=user_data)

@app.put("/api/users/{user_id}/status")
def update_user_status(user_id: int, status_data: dict, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    # Only allow users to update their own status
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Csak a saját státuszodat módosíthatod")
    
    # Update user status
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    db_user.status = status_data.get("status", db_user.status)
    db_user.last_active = func.now()
    
    # Save status history
    status_history = models.UserStatusHistory(
        user_id=user_id,
        status=status_data.get("status"),
        note=status_data.get("note")
    )
    db.add(status_history)
    
    db.commit()
    db.refresh(db_user)
    
    return {"message": "Státusz frissítve", "status": db_user.status}

@app.post("/api/users/{user_id}/avatar")
async def upload_avatar(
    user_id: int, 
    file: UploadFile = File(...),
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_user)
):
    # Only allow users to update their own avatar
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Csak a saját profilképedet módosíthatod")
    
    # Check if user exists
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Csak kép fájlokat lehet feltölteni (JPEG, PNG, GIF, WebP)")
    
    # Validate file size (5MB max)
    if file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="A fájl mérete nem lehet nagyobb 5MB-nál")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1].lower()
    unique_filename = f"{user_id}_{uuid.uuid4().hex}.{file_extension}"
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("/home/viragma/familyhub-app/uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = upload_dir / unique_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fájl mentési hiba: {str(e)}")
    
    # Delete old avatar if exists
    if db_user.avatar_url:
        old_file_path = Path(db_user.avatar_url.replace("/uploads/", "/home/viragma/familyhub-app/uploads/"))
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except:
                pass  # Ignore errors when deleting old file
    
    # Update user avatar URL
    avatar_url = f"/uploads/avatars/{unique_filename}"
    db_user.avatar_url = avatar_url
    db_user.updated_at = func.now()
    
    db.commit()
    db.refresh(db_user)
    
    return {
        "message": "Profilkép sikeresen feltöltve",
        "avatar_url": avatar_url,
        "filename": unique_filename
    }

@app.get("/api/users/{user_id}/settings", response_model=UserSettings)
def get_user_settings(user_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Csak a saját beállításaidat nézheted meg")
    
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == user_id).first()
    if not settings:
        # Create default settings
        settings = models.UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

@app.put("/api/users/{user_id}/settings")
def update_user_settings(user_id: int, settings_data: UserSettingsUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Csak a saját beállításaidat módosíthatod")
    
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == user_id).first()
    if not settings:
        # Create new settings
        settings = models.UserSettings(user_id=user_id)
        db.add(settings)
    
    # Update fields
    update_data = settings_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    settings.updated_at = func.now()
    db.commit()
    db.refresh(settings)
    
    return {"message": "Beállítások frissítve"}

@app.get("/api/users/{user_id}/events", response_model=List[UserEvent])
def get_user_events(user_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Csak a saját programjaidat nézheted meg")
    
    today = datetime.now().date()
    events = db.query(models.UserEvent).filter(
        models.UserEvent.user_id == user_id,
        func.date(models.UserEvent.start_time) == today
    ).order_by(models.UserEvent.start_time).all()
    
    return events

@app.delete("/api/users/{user_id}", response_model=User)
def remove_user(user_id: int, db: Session = Depends(get_db), admin: UserModel = Depends(get_current_admin_user)):
    return crud_delete_user(db=db, user_id=user_id)

@app.get("/api/tasks", response_model=list[TaskSchema])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_tasks(db, skip=skip, limit=limit)

@app.post("/api/tasks/", response_model=TaskSchema)
def create_new_task(task: TaskCreate, db: Session = Depends(get_db)):
    return create_task(db=db, task=task)
    
@app.post("/api/tasks/{task_id}/toggle", response_model=TaskSchema)
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    db_task = toggle_task_status(db=db, task_id=task_id)
    if db_task is None: raise HTTPException(status_code=404, detail="A feladat nem található")
    return db_task

@app.delete("/api/tasks/{task_id}", response_model=TaskSchema)
def remove_task_endpoint(task_id: int, db: Session = Depends(get_db)):
    db_task = delete_task(db=db, task_id=task_id)
    if db_task is None: raise HTTPException(status_code=404, detail="A feladat nem található")
    return db_task

# === JAVÍTÁS: HIÁNYZÓ GET VÉGPONT HOZZÁADVA ===
@app.get("/api/accounts", response_model=List[Account])
def read_accounts(
    type: Optional[str] = None,
    status: Optional[str] = 'active', # Új, opcionális paraméter
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Listázza a kasszákat típus és státusz alapján a felhasználó jogosultságainak megfelelően.
    """
    return get_accounts_by_family(db, user=current_user, account_type=type, status=status)

@app.post("/api/accounts", response_model=Account)
def create_new_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return create_family_account(db=db, account=account, family_id=current_user.family_id, owner_user=current_user)

@app.put("/api/accounts/{account_id}", response_model=Account)
def update_account_details(
    account_id: int,
    account_data: AccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return update_account(db=db, account_id=account_id, account_data=account_data, user=current_user)

@app.get("/api/categories", response_model=list[CategorySchema])
def read_categories(db: Session = Depends(get_db)):
    return get_categories_tree(db)

@app.get("/api/categories/tree", response_model=list[CategorySchema])
def read_categories_as_tree(db: Session = Depends(get_db)):
    return get_categories_tree(db)

# === JAVÍTÁS ITT: CategoryCreate sémát használunk a body validálására ===
@app.post("/api/categories", response_model=CategorySchema)
def add_category(category: CategoryCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin_user)):
    return create_category(db, category)

# === JAVÍTÁS ITT: CategoryCreate sémát használunk a body validálására ===
@app.put("/api/categories/{category_id}", response_model=CategorySchema)
def update_category_details(category_id: int, category_data: CategoryCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin_user)):
    return update_category(db, category_id, category_data)


@app.delete("/api/categories/{category_id}", response_model=CategorySchema)
def remove_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(get_current_admin_user)
):
    """ Töröl egy kategóriát (csak Családfő). """
    return delete_category(db=db, category_id=category_id)

@app.get("/api/transactions", response_model=list[Transaction])
def read_transactions(
    account_id: int | None = None,
    type: str | None = None,
    search: str | None = None,
    sort_by: str | None = 'date_desc',
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    return get_transactions(
        db=db, 
        user=current_user, 
        account_id=account_id,
        transaction_type=type,
        search_term=search,
        sort_by=sort_by
    )
@app.put("/api/transactions/{transaction_id}", response_model=Transaction)
def update_transaction_details(
    transaction_id: int,
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user) # A bejelentkezett felhasználó
):
    # Átadjuk a 'current_user'-t a CRUD függvénynek
    return update_transaction(db=db, transaction_id=transaction_id, transaction_data=transaction_data, user=current_user)

@app.delete("/api/transactions/{transaction_id}", response_model=Transaction)
def remove_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user) # A bejelentkezett felhasználó
):
    # Átadjuk a 'current_user'-t a CRUD függvénynek
    return delete_transaction(db=db, transaction_id=transaction_id, user=current_user)

@app.post("/api/transfers")
def execute_transfer(
    transfer_data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Végrehajt egy átutalást két kassza között.
    Ez a művelet két tranzakciót hoz létre (egy kiadást és egy bevételt).
    """
    return create_transfer(db=db, transfer_data=transfer_data, user=current_user)

@app.post("/api/users", response_model=User)
def add_new_user_by_admin(user: UserCreate, db: Session = Depends(get_db), admin: UserModel = Depends(get_current_admin_user)):
    """ Új családtag hozzáadása (csak Családfő által). Automatikusan létrehozza a személyes kasszáját is. """
    return create_user(db=db, user=user)

@app.get("/api/transfer-recipients", response_model=list[Account])
def read_transfer_recipients(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """ Visszaadja az összes lehetséges és jogosult címzettet egy átutaláshoz. """
    return get_valid_transfer_targets(db=db, user=current_user)


@app.get("/api/dashboard", response_model=DashboardResponse)
def read_dashboard_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ez az API végpont lekéri a teljes dashboard adatcsomagot
    a crud modulból.
    """
    dashboard_data = get_dashboard_data(db=db, user=current_user)
    if not dashboard_data:
        raise HTTPException(status_code=404, detail="Dashboard data not found")
    return dashboard_data

@app.post("/api/accounts", response_model=Account)
def create_new_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ Létrehoz egy új kasszát, és beállítja a láthatóságát. """
    # JAVÍTÁS: Szerver-oldali dátum validáció
    if account.type == 'cél' and account.goal_date and account.goal_date < date.today():
        raise HTTPException(status_code=400, detail="A cél dátuma nem lehet a múltban.")

    if account.show_on_dashboard and current_user.role not in ['Családfő', 'Szülő']:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a kasszát a dashboardon megjeleníteni.")
        
    return create_family_account(db=db, account=account, family_id=current_user.family_id, owner_user=current_user)

@app.get("/api/accounts/{account_id}", response_model=Account)
def read_account_details(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ Visszaadja egyetlen kassza részletes adatait, jogosultsággal ellenőrizve. """
    db_account = get_account(db=db, account_id=account_id, user=current_user)
    if db_account is None:
        raise HTTPException(status_code=404, detail="Kassza nem található.")
    return db_account

@app.delete("/api/accounts/{account_id}")
def remove_account(
    account_id: int, 
    force: bool = False,  # ÚJ query parameter
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_user)
):
    """
    Kassza törlése.
    ?force=true esetén a függőségeket is törli.
    """
    if force:
        return delete_account_with_dependencies(db=db, account_id=account_id, user=current_user, force=True)
    else:
        return delete_account(db=db, account_id=account_id, user=current_user)
@app.get("/api/accounts/{account_id}/dependencies")
def check_account_dependencies(
    account_id: int,
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_user)
):
    """
    Ellenőrzi, hogy egy kassza törölhető-e (milyen függőségei vannak)
    """
    return delete_account_with_dependencies(db=db, account_id=account_id, user=current_user, force=False)
@app.post("/api/accounts/{account_id}/transactions", response_model=TransactionSchema)
def add_transaction_to_account(
    account_id: int,
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Hozzáad egy új bevételi vagy kiadási tranzakciót egy adott kasszához.
    """
    return create_account_transaction(db=db, transaction=transaction, account_id=account_id, user=current_user)



    
@app.post("/api/accounts/{account_id}/share", response_model=Account)
def toggle_account_sharing(
    account_id: int, 
    viewer_id: int,
    share: bool, # true = megosztás, false = megosztás visszavonása
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_user)
):
    """ Módosítja egy kassza láthatóságát egy másik felhasználó számára (csak a tulajdonos). """
    return update_account_viewer(db=db, account_id=account_id, viewer_id=viewer_id, owner=current_user, add=share)

@app.post("/api/recurring-rules", response_model=RecurringRule)
def add_recurring_rule(
    rule: RecurringRuleCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ Létrehoz egy új ismétlődő tranzakciós szabályt. """
    return create_recurring_rule(db=db, rule=rule, user=current_user)

@app.get("/api/recurring-rules", response_model=list[RecurringRule])
def read_recurring_rules(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    return get_recurring_rules(db=db, user=current_user)

@app.put("/api/recurring-rules/{rule_id}", response_model=RecurringRule)
def update_rule(rule_id: int, rule: RecurringRuleCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    return update_recurring_rule(db=db, rule_id=rule_id, rule_data=rule, user=current_user)

@app.delete("/api/recurring-rules/{rule_id}", response_model=RecurringRule)
def delete_rule(rule_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    return delete_recurring_rule(db=db, rule_id=rule_id, user=current_user)
@app.patch("/api/recurring-rules/{rule_id}/toggle-active", response_model=RecurringRule)
def toggle_rule(rule_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """ Aktiválja vagy szünetelteti az ismétlődő szabályt. """
    return toggle_rule_status(db=db, rule_id=rule_id, user=current_user)

@app.get("/api/debug/dashboard-parts")
def debug_dashboard_parts(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Debug endpoint - részekre bontva tesztelni"""
    try:
        # 1. Tasks tesztelés
        tasks = get_tasks(db, user=current_user)
        print(f"Tasks OK: {len(tasks)}")
        
        # 2. Financial tesztelés  
        financials = get_financial_summary(db, user=current_user)
        print(f"Financials OK: {financials}")
        
        # 3. Goals tesztelés
        goals = get_dashboard_goals(db, user=current_user)
        print(f"Goals OK: {len(goals['family_goals'])} family, {len(goals['personal_goals'])} personal")
        
        return {"status": "All parts working"}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/api/analytics/category-spending")
def get_category_spending_endpoint(
    month: Optional[int] = Query(None, description="Hónap (1-12)"),
    year: Optional[int] = Query(None, description="Év"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Kategória költések lekérdezése dashboard kártyához
    """
    try:
        data = get_category_spending_analytics(db, current_user, month, year)
        return data
    except Exception as e:
        print(f"Category spending endpoint error: {e}")
        return []

@app.get("/api/analytics/savings-trend")
def get_savings_trend_endpoint(
    year: Optional[int] = Query(None, description="Év"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Havi megtakarítás trend lekérdezése dashboard kártyához
    """
    try:
        data = get_savings_trend_analytics(db, current_user, year)
        return data
    except Exception as e:
        print(f"Savings trend endpoint error: {e}")
        return []

@app.get("/api/analytics/category-detailed")
def get_detailed_category_endpoint(
    start_date: str = Query(..., description="Kezdő dátum (YYYY-MM-DD)", alias="startDate"),
    end_date: str = Query(..., description="Befejező dátum (YYYY-MM-DD)", alias="endDate"),
    categories: Optional[str] = Query(None, description="Kategória ID-k vesszővel elválasztva"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Részletes kategória analitika analytics oldalhoz
    """
    try:
        # A string-ként érkező kategória ID-kat listává alakítjuk
        category_ids = [int(cat_id) for cat_id in categories.split(',')] if categories else None
        
        return get_detailed_category_analytics(
            db=db, 
            user=current_user, 
            start_date=start_date, 
            end_date=end_date, 
            category_ids=category_ids
        )
    except Exception as e:
        print(f"Detailed category endpoint error: {e}")
        return {"categories": [], "subcategories": []}

@app.get("/api/analytics/savings-detailed")
def get_detailed_savings_endpoint(
    start_date: str = Query(..., description="Kezdő dátum (YYYY-MM-DD)", alias="startDate"),
    end_date: str = Query(..., description="Befejező dátum (YYYY-MM-DD)", alias="endDate"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Részletes megtakarítás analitika analytics oldalhoz
    """
    try:
        return get_detailed_savings_analytics(
            db=db, 
            user=current_user, 
            start_date=start_date, 
            end_date=end_date
        )
    except Exception as e:
        print(f"Detailed savings endpoint error: {e}")
        return []


@app.get("/api/expected-expenses", response_model=List[ExpectedExpenseSchema])
def read_expected_expenses(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Lekérdezi a felhasználó számára látható, tervezett állapotú várható költségeket."""
    return get_expected_expenses(db=db, user=current_user)

@app.post("/api/expected-expenses", response_model=ExpectedExpenseSchema, status_code=status.HTTP_201_CREATED)
def add_expected_expense(
    expense_data: ExpectedExpenseCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Új várható költség létrehozása."""
    return create_expected_expense(db=db, expense_data=expense_data, user=current_user)

@app.put("/api/expected-expenses/{expense_id}", response_model=ExpectedExpenseSchema)
def modify_expected_expense(
    expense_id: int,
    expense_data: ExpectedExpenseCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Meglévő várható költség módosítása."""
    return update_expected_expense(db=db, expense_id=expense_id, expense_data=expense_data, user=current_user)

@app.delete("/api/expected-expenses/{expense_id}", response_model=ExpectedExpenseSchema)
def remove_expected_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Várható költség törlése (státusz módosítása)."""
    return delete_expected_expense(db=db, expense_id=expense_id, user=current_user)

@app.post("/api/expected-expenses/{expense_id}/complete", response_model=ExpectedExpenseSchema)
def complete_expense(
    expense_id: int,
    completion_data: ExpectedExpenseComplete,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Egy várható költséget valódi tranzakcióvá alakít."""
    return complete_expected_expense(db=db, expense_id=expense_id, completion_data=completion_data, user=current_user)

@app.get("/api/upcoming-events", response_model=List[UpcomingEvent])
def read_upcoming_events(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Lekérdezi a következő 30 nap eseményeit."""
    return get_upcoming_events(db=db, user=current_user)


@app.post("/api/wishes", response_model=WishSchema, status_code=status.HTTP_201_CREATED)
def add_new_wish(
    wish: WishCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Új kívánság létrehozása a bejelentkezett felhasználó számára."""
    return create_wish(db=db, wish=wish, user=current_user)

@app.get("/api/wishes", response_model=List[WishSchema])
def read_wishes(
    statuses: Optional[List[str]] = Query(None),
    owner_ids: Optional[List[int]] = Query(None),
    category_ids: Optional[List[int]] = Query(None),
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Listázza a család kívánságait szűrési lehetőségekkel."""
    wishes = get_wishes_by_family(
        db=db, user=current_user, 
        statuses=statuses, owner_ids=owner_ids, category_ids=category_ids,
        skip=skip, limit=limit
    )
    return wishes

@app.get("/api/wishes/{wish_id}", response_model=WishSchema)
def read_wish(
    wish_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Egy konkrét kívánság lekérdezése ID alapján."""
    db_wish = get_wish(db, wish_id=wish_id, user=current_user)
    if db_wish is None:
        raise HTTPException(status_code=404, detail="Kívánság nem található")
    return db_wish

@app.put("/api/wishes/{wish_id}", response_model=WishSchema)
def modify_wish(
    wish_id: int, 
    wish: WishCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Meglévő kívánság módosítása."""
    db_wish = update_wish(db, wish_id=wish_id, wish_data=wish, user=current_user)
    if db_wish is None:
        raise HTTPException(status_code=404, detail="Kívánság nem található")
    return db_wish

@app.delete("/api/wishes/{wish_id}")
def remove_wish(
    wish_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Kívánság törlése (soft delete)."""
    result = delete_wish(db, wish_id=wish_id, user=current_user)
    if not result:
        raise HTTPException(status_code=404, detail="Kívánság nem található")
    return result

@app.post("/api/wishes/{wish_id}/submit", response_model=WishSchema)
def submit_wish(
    wish_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Egy kívánság beküldése jóváhagyásra (állapot: draft -> pending)."""
    return submit_wish_for_approval(db=db, wish_id=wish_id, user=current_user)

@app.post("/api/wishes/{wish_id}/approval")
def decide_on_wish(
    wish_id: int,
    # JAVÍTÁS: A séma itt WishApprovalCreate-re változik
    approval_data: WishApprovalCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Egy szülő/családfő döntést hoz egy kívánságról (approve, reject, etc.)."""
    # A hívott crud függvény már a helyes sémát várja, itt nincs teendő
    return process_wish_approval(db=db, wish_id=wish_id, approval_data=approval_data, approver=current_user)


@app.get("/api/notifications", response_model=List[Notification])
def read_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Lekérdezi a felhasználó számára releváns dashboard értesítéseket."""
    return get_dashboard_notifications(db=db, user=current_user)

@app.get("/api/wishes/{wish_id}/history", response_model=List[WishHistorySchema])
def read_wish_history(
    wish_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Egy kívánság teljes előzményének lekérdezése."""
    return get_wish_history(db=db, wish_id=wish_id, user=current_user)

@app.post("/api/wishes/create_and_submit", response_model=WishSchema, status_code=status.HTTP_201_CREATED)
def add_and_submit_new_wish(
    wish: WishCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Új kívánság létrehozása és azonnali beküldése jóváhagyásra."""
    return create_and_submit_wish(db=db, wish=wish, user=current_user)

@app.post("/api/wishes/{wish_id}/activate", response_model=WishSchema)
def activate_wish_funding(
    wish_id: int,
    request_data: WishActivationRequest, # A sima requestet cseréljük erre
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Elindítja a gyűjtést egy kívánságra. Ha a goal_account_id meg van adva,
    hozzárendeli a meglévő kasszához. Ha nincs, újat hoz létre.
    """
    from .crud import activate_wish
    return activate_wish(db=db, wish_id=wish_id, user=current_user, goal_account_id=request_data.goal_account_id)


# A backend/main.py fájlban, a többi @router.post végpont közé

@app.post("/accounts/{account_id}/close", status_code=status.HTTP_200_OK)
def close_account_goal(account_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Lezár egy célkasszát és teljesítettnek jelöli a kapcsolódó kívánságokat.
    """
    result = close_goal_account(db=db, account_id=account_id, user=current_user)
    return result

# === EZ AZ ÚJ VÉGPONT A KASSZA LEZÁRÁSÁHOZ ===
@app.post("/api/accounts/{account_id}/close", tags=["Accounts"])
def close_account_goal_endpoint(
    account_id: int,
    request_data: GoalCloseRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Lezár egy célkasszát a "persely" logika alapján:
    létrehoz egy statisztikai kiadást, lenullázza a kasszát,
    és teljesített státuszba helyezi a kapcsolódó kívánságokat.
    """
    return close_goal_account(
        db=db,
        account_id=account_id,
        user=current_user,
        request_data=request_data
    )

# === TIME MANAGEMENT API ENDPOINTS ===

# Work Shifts
@app.post("/api/time-management/shifts", response_model=schemas.WorkShift)
def create_shift(
    shift: schemas.WorkShiftCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_work_shift(db=db, shift=shift, user_id=current_user.id)

@app.get("/api/time-management/shifts", response_model=List[schemas.WorkShift])
def get_my_shifts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_user_shifts(db=db, user_id=current_user.id)

@app.get("/api/time-management/shifts/family", response_model=List[schemas.WorkShift])
def get_family_shifts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_family_shifts(db=db, family_id=current_user.family_id)

@app.put("/api/time-management/shifts/{shift_id}", response_model=schemas.WorkShift)
def update_shift(
    shift_id: int,
    shift_update: schemas.WorkShiftUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated_shift = crud.update_work_shift(db=db, shift_id=shift_id, shift_update=shift_update, user_id=current_user.id)
    if not updated_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return updated_shift

@app.delete("/api/time-management/shifts/{shift_id}")
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = crud.delete_work_shift(db=db, shift_id=shift_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Shift not found")
    return {"message": "Shift deleted successfully"}

# Shift Templates
@app.post("/api/time-management/shift-templates", response_model=schemas.ShiftTemplate)
def create_shift_template(
    template: schemas.ShiftTemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_shift_template(db=db, template=template, user_id=current_user.id)

@app.get("/api/time-management/shift-templates", response_model=List[schemas.ShiftTemplate])
def get_my_shift_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_user_shift_templates(db=db, user_id=current_user.id)

@app.get("/api/time-management/shift-templates/family", response_model=List[schemas.ShiftTemplate])
def get_family_shift_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_family_shift_templates(db=db, family_id=current_user.family_id)

@app.put("/api/time-management/shift-templates/{template_id}", response_model=schemas.ShiftTemplate)
def update_shift_template(
    template_id: int,
    template_update: schemas.ShiftTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated_template = crud.update_shift_template(db=db, template_id=template_id, template_update=template_update, user_id=current_user.id)
    if not updated_template:
        raise HTTPException(status_code=404, detail="Shift template not found")
    return updated_template

@app.delete("/api/time-management/shift-templates/{template_id}")
def delete_shift_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = crud.delete_shift_template(db=db, template_id=template_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Shift template not found")
    return {"message": "Shift template deleted successfully"}

# Shift Assignments
@app.post("/api/time-management/shift-assignments", response_model=schemas.ShiftAssignment)
def create_shift_assignment(
    assignment: schemas.ShiftAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_shift_assignment(db=db, assignment=assignment, user_id=current_user.id)

@app.get("/api/time-management/shift-assignments", response_model=List[schemas.ShiftAssignment])
def get_my_shift_assignments(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_user_shift_assignments(db=db, user_id=current_user.id, start_date=start_date, end_date=end_date)

@app.get("/api/time-management/shift-assignments/family", response_model=List[schemas.ShiftAssignment])
def get_family_shift_assignments(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_family_shift_assignments(db=db, family_id=current_user.family_id, start_date=start_date, end_date=end_date)

@app.get("/api/time-management/monthly-schedule/{month}/{year}", response_model=schemas.MonthlySchedule)
def get_monthly_schedule(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_monthly_schedule(db=db, user_id=current_user.id, month=month, year=year)

@app.put("/api/time-management/shift-assignments/{assignment_id}", response_model=schemas.ShiftAssignment)
def update_shift_assignment(
    assignment_id: int,
    assignment_update: schemas.ShiftAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated_assignment = crud.update_shift_assignment(db=db, assignment_id=assignment_id, assignment_update=assignment_update, user_id=current_user.id)
    if not updated_assignment:
        raise HTTPException(status_code=404, detail="Shift assignment not found")
    return updated_assignment

@app.delete("/api/time-management/shift-assignments/{assignment_id}")
def delete_shift_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = crud.delete_shift_assignment(db=db, assignment_id=assignment_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Shift assignment not found")
    return {"message": "Shift assignment deleted successfully"}

# Calendar Integrations
@app.post("/api/time-management/calendar-integrations", response_model=schemas.CalendarIntegration)
def create_calendar_integration(
    integration: schemas.CalendarIntegrationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_calendar_integration(db=db, integration=integration, user_id=current_user.id)

@app.get("/api/time-management/calendar-integrations", response_model=List[schemas.CalendarIntegration])
def get_my_calendar_integrations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_user_calendar_integrations(db=db, user_id=current_user.id)

@app.put("/api/time-management/calendar-integrations/{integration_id}", response_model=schemas.CalendarIntegration)
def update_calendar_integration(
    integration_id: int,
    integration_update: schemas.CalendarIntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated_integration = crud.update_calendar_integration(
        db=db, integration_id=integration_id, integration_update=integration_update, user_id=current_user.id
    )
    if not updated_integration:
        raise HTTPException(status_code=404, detail="Calendar integration not found")
    return updated_integration

@app.delete("/api/time-management/calendar-integrations/{integration_id}")
def delete_calendar_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = crud.delete_calendar_integration(db=db, integration_id=integration_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Calendar integration not found")
    return {"message": "Calendar integration deleted successfully"}

# Time Conflicts
@app.post("/api/time-management/conflicts", response_model=schemas.TimeConflict)
def create_conflict(
    conflict: schemas.TimeConflictCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_time_conflict(db=db, conflict=conflict, family_id=current_user.family_id)

@app.get("/api/time-management/conflicts", response_model=List[schemas.TimeConflict])
def get_family_conflicts(
    status: Optional[str] = Query("active"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_family_conflicts(db=db, family_id=current_user.family_id, status=status)

@app.put("/api/time-management/conflicts/{conflict_id}/resolve")
def resolve_conflict(
    conflict_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    resolved_conflict = crud.resolve_time_conflict(db=db, conflict_id=conflict_id, family_id=current_user.family_id)
    if not resolved_conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")
    return {"message": "Conflict resolved successfully"}

@app.put("/api/time-management/conflicts/{conflict_id}/snooze")
def snooze_conflict(
    conflict_id: int,
    snooze_until: datetime,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    snoozed_conflict = crud.snooze_time_conflict(
        db=db, conflict_id=conflict_id, family_id=current_user.family_id, snooze_until=snooze_until
    )
    if not snoozed_conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")
    return {"message": "Conflict snoozed successfully"}

# Family Events
@app.post("/api/time-management/events", response_model=schemas.FamilyEvent)
def create_event(
    event: schemas.FamilyEventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_family_event(db=db, event=event, family_id=current_user.family_id, creator_id=current_user.id)

@app.get("/api/time-management/events", response_model=List[schemas.FamilyEvent])
def get_family_events(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_family_events(db=db, family_id=current_user.family_id, start_date=start_date, end_date=end_date)

@app.get("/api/time-management/events/today", response_model=List[schemas.FamilyEvent])
def get_todays_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_todays_events(db=db, family_id=current_user.family_id)

@app.put("/api/time-management/events/{event_id}", response_model=schemas.FamilyEvent)
def update_event(
    event_id: int,
    event_update: schemas.FamilyEventUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated_event = crud.update_family_event(
        db=db, event_id=event_id, event_update=event_update, family_id=current_user.family_id
    )
    if not updated_event:
        raise HTTPException(status_code=404, detail="Event not found")
    return updated_event

@app.delete("/api/time-management/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = crud.delete_family_event(db=db, event_id=event_id, family_id=current_user.family_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}

# User Status Management
@app.put("/api/time-management/status")
def update_my_status(
    status_update: schemas.UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated_user = crud.update_user_status(db=db, user_id=current_user.id, status_update=status_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Status updated successfully"}

@app.get("/api/time-management/family-status")
def get_family_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_family_status(db=db, family_id=current_user.family_id)

# Dashboard endpoint for time management
@app.get("/api/time-management/dashboard", response_model=schemas.DashboardTimeData)
def get_time_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_dashboard_time_data(db=db, family_id=current_user.family_id)