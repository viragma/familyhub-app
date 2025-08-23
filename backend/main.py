from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .crud import (
    get_tasks, create_task, toggle_task_status, delete_task,
    create_family, create_user, get_user, update_user, 
    delete_user as crud_delete_user, get_users_by_family,
    create_family_account, get_accounts_by_family, create_account_transaction,
    create_category, get_categories,get_transactions,update_transaction, delete_transaction,
    create_transfer,get_all_personal_accounts,get_financial_summary,update_category, delete_category
)
from .models import Base, Task, User as UserModel, Category as CategoryModel
from . import models
from .schemas import (
    Task as TaskSchema, TaskCreate,
    Family, FamilyCreate,
    User, UserCreate, UserProfile,
    Account, Transaction, TransactionCreate, AccountCreate,
    Category as CategorySchema, CategoryCreate,TransferCreate
)
from .database import SessionLocal, engine
from .security import create_access_token, verify_pin, oauth2_scheme, SECRET_KEY, ALGORITHM
from jose import JWTError, jwt

# Base.metadata.create_all(bind=engine) # Handled by Alembic

app = FastAPI()

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
    """ Visszaadja az összes lehetséges címzettet egy átutaláshoz (a család összes személyes kasszáját). """
    return get_all_personal_accounts(db=db, family_id=current_user.family_id)

@app.get("/api/dashboard")
def get_dashboard_data(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    tasks_from_db = get_tasks(db, user=current_user)
    financials = get_financial_summary(db, user=current_user)
    
    # JAVÍTÁS: Visszatesszük a hiányzó statikus adatokat a dinamikusok mellé
    return {
         "financial_summary": financials,
         "tasks": tasks_from_db,
         "goal": {"name": "Nyaralás Alap", "current": 320000, "target": 500000},
         "family": [ { "id": 1, "name": 'Apa', "initial": 'A', "online": True, "color": '...' } ],
         "shopping_list": { "items": ['Tej (2 liter)','Kenyér'], "estimated_cost": 8500 }
    }
@app.post("/api/accounts", response_model=Account)
def create_new_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user) # A létrehozó felhasználó
):
    """ Létrehoz egy új kasszát, és beállítja a láthatóságát. """
    return create_family_account(db=db, account=account, family_id=current_user.family_id, owner_user=current_user)