from fastapi import FastAPI, Depends, HTTPException, status, Form, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .scheduler import scheduler
from sqlalchemy import func, extract, and_, or_
from datetime import datetime, timedelta, date
from typing import Optional, List
from fastapi import Query
from contextlib import asynccontextmanager

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
   
)
from .models import Base, Task, User as UserModel, Category as CategoryModel
from . import models
from .schemas import (
    Task as TaskSchema, TaskCreate,
    Family, FamilyCreate,
    User, UserCreate, UserProfile,
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
    GoalCloseRequest


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
def update_user_details(user_id: int, user_data: UserCreate, db: Session = Depends(get_db), admin: UserModel = Depends(get_current_admin_user)):
    return update_user(db=db, user_id=user_id, user_data=user_data)

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
@app.get("/api/accounts", response_model=list[Account])
def read_accounts(
    type: Optional[str] = Query(None, description="Filter accounts by type (e.g., 'cél')"),
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """ Listázza a kasszákat, a felhasználó szerepköre alapján és opcionálisan típus szerint szűrve. """
    return get_accounts_by_family(db, user=current_user, account_type=type)

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


@app.get("/api/dashboard")  # ✅ NO response_model!
def get_dashboard_data(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    try:
        # Manual, biztonságos hívások
        tasks_raw = get_tasks(db, user=current_user)
        financials = get_financial_summary(db, user=current_user)
        goals_raw = get_dashboard_goals(db, user=current_user)
         # --- ÚJ RÉSZ KEZDETE ---
        forecast = get_next_month_forecast(db, user=current_user) # Új függvény hívása
        # --- ÚJ RÉSZ VÉGE ---
        
        # Tasks manual serialization
        tasks = [
            {
                "id": task.id,
                "title": task.title,
                "status": task.status,
                "reward_type": task.reward_type,
                "reward_value": task.reward_value,
                "owner_id": task.owner_id,
                # Owner info - safe loading
                "owner": {
                    "id": task.owner.id,
                    "display_name": task.owner.display_name,
                    "avatar_url": task.owner.avatar_url
                } if task.owner else None
            }
            for task in tasks_raw
        ]
        
        # Goals manual serialization
        def serialize_account(acc):
            return {
                "id": acc.id,
                "name": acc.name,
                "type": acc.type,
                "balance": float(acc.balance),
                "goal_amount": float(acc.goal_amount) if acc.goal_amount else None,
                "goal_date": acc.goal_date.isoformat() if acc.goal_date else None,
                "show_on_dashboard": getattr(acc, 'show_on_dashboard', False),
                "owner_user": {
                    "id": acc.owner_user.id,
                    "display_name": acc.owner_user.display_name,
                    "avatar_url": acc.owner_user.avatar_url
                } if acc.owner_user else None
            }
        
        goals = {
            "family_goals": [serialize_account(acc) for acc in goals_raw["family_goals"]],
            "personal_goals": [serialize_account(acc) for acc in goals_raw["personal_goals"]]
        }
        
        return {
            "financial_summary": financials,
            "tasks": tasks,
            "goals": goals,
            "next_month_forecast": forecast
        }
        
    except Exception as e:
        print(f"Dashboard error: {e}")  # Debug
        # Fallback minimal response
        return {
            "financial_summary": {
                "view_type": "error",
                "total_balance": 0,
                "monthly_income": 0,
                "monthly_expense": 0,
                "monthly_savings": 0
            },
            "tasks": [],
            "goals": {"family_goals": [], "personal_goals": []}
        }
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