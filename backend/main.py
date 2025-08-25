from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .scheduler import scheduler
from contextlib import asynccontextmanager

from .crud import (
    get_tasks, create_task, toggle_task_status, delete_task,
    create_family, create_user, get_user, update_user, 
    delete_user as crud_delete_user, get_users_by_family,
    create_family_account, get_accounts_by_family, create_account_transaction,
    create_category, get_categories,get_transactions,update_transaction, delete_transaction,
    create_transfer,get_all_personal_accounts,get_financial_summary,update_category, delete_category,update_account, delete_account,get_account,
    update_account_viewer,create_recurring_rule,get_all_transfer_targets,get_valid_transfer_targets,get_recurring_rules, update_recurring_rule, delete_recurring_rule,
    toggle_rule_status,get_dashboard_goals

)
from .models import Base, Task, User as UserModel, Category as CategoryModel
from . import models
from .schemas import (
    Task as TaskSchema, TaskCreate,
    Family, FamilyCreate,
    User, UserCreate, UserProfile,
    Account, Transaction, TransactionCreate, AccountCreate,
    Category as CategorySchema, CategoryCreate,TransferCreate,
    RecurringRule, RecurringRuleCreate 
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
def login_for_access_token(user_id: int, pin: str, db: Session = Depends(get_db)):
    user = get_user(db, user_id=user_id)
    if not user or not verify_pin(pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="Hibás felhasználói azonosító vagy PIN kód", headers={"WWW-Authenticate": "Bearer"})
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

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

@app.get("/api/accounts", response_model=list[Account])
def read_accounts(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """ Listázza a kasszákat, a felhasználó szerepköre alapján szűrve. """
    return get_accounts_by_family(db, user=current_user)

@app.post("/api/accounts/{account_id}/transactions", response_model=Transaction)
def add_transaction_to_account(
    account_id: int, 
    transaction: TransactionCreate, 
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """ Hozzáad egy új tranzakciót egy adott kasszához. """
    # JAVÍTÁS: 'user_id=current_user.id' helyett a teljes 'user=current_user' objektumot adjuk át.
    return create_account_transaction(
        db=db, 
        transaction=transaction, 
        account_id=account_id, 
        user=current_user
    )
@app.get("/api/categories", response_model=list[CategorySchema])
def read_categories(db: Session = Depends(get_db)):
    return get_categories(db=db)

@app.get("/api/categories/tree")  
def read_categories_tree(db: Session = Depends(get_db)):
    return get_categories_tree(db=db)

@app.post("/api/categories", response_model=CategorySchema)
def add_category(category: CategoryCreate, db: Session = Depends(get_db), admin: UserModel = Depends(get_current_admin_user)):
    return create_category(db=db, category=category)

@app.put("/api/categories/{category_id}", response_model=CategorySchema)
def update_category_details(
    category_id: int,
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(get_current_admin_user)
):
    """ Módosít egy kategóriát (csak Családfő). """
    return update_category(db=db, category_id=category_id, category_data=category_data)

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


@app.get("/api/dashboard")
def get_dashboard_data(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    tasks_from_db = get_tasks(db, user=current_user)
    financials = get_financial_summary(db, user=current_user)
    goals = get_dashboard_goals(db, user=current_user) # Új hívás
    
    return {
         "financial_summary": financials,
         "tasks": tasks_from_db,
         "goals": goals # A régi, statikus 'goal' helyett
    }
@app.post("/api/accounts", response_model=Account)
def create_new_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """ Létrehoz egy új kasszát, és beállítja a láthatóságát. """
    # Biztonsági ellenőrzés: csak szülők állíthatják be a dashboard megjelenést
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

@app.delete("/api/accounts/{account_id}", response_model=Account)
def remove_account(
    account_id: int, 
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_user) # JAVÍTÁS: Átállás admin-ról sima user-re
):
    """ Töröl egy kasszát a tulajdonos vagy egy szülő. """
    return delete_account(db=db, account_id=account_id, user=current_user)
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