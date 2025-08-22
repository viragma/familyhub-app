from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from . import models, schemas
from fastapi import HTTPException,status
# JAVÍTÁS: Itt importáljuk az összes szükséges sémát
from .schemas import (
    Task as TaskSchema, TaskCreate,
    Family, FamilyCreate,
    User, UserCreate, UserProfile,Account, Transaction, TransactionCreate,TransferCreate
)
from .security import get_pin_hash
from . import models
import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
# JAVÍTÁS: Hozzáadjuk a hiányzó 'func' és 'extract' importokat
from sqlalchemy import func, extract
from datetime import datetime
import uuid
from . import models, schemas
from .security import get_pin_hash

# --- User CRUD Műveletek ---
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pin = get_pin_hash(user.pin)
    db_user = models.User(
        name=user.name,
        display_name=user.display_name,
        birth_date=user.birth_date,
        avatar_url=user.avatar_url,
        role=user.role,
        pin_hash=hashed_pin,
        family_id=user.family_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    personal_account_schema = schemas.AccountCreate(
        name=f"{db_user.display_name} kasszája",
        type="személyes"
    )
    create_family_account(
        db=db, 
        account=personal_account_schema, 
        family_id=db_user.family_id,
        owner_user_id=db_user.id # Hozzárendeljük az új userhez
    )
    
    return db_user
# --- Family CRUD Műveletek ---
def create_family(db: Session, family: FamilyCreate):
    db_family = models.Family(name=family.name)
    db.add(db_family)
    db.commit()
    db.refresh(db_family)
    return db_family

# --- Task CRUD Műveletek (már léteznek) ---
def get_tasks(db: Session, user: models.User, skip: int = 0, limit: int = 100):
    """
    Listázza a feladatokat a felhasználó jogosultságai alapján.
    A Szülők és a Családfő minden feladatot látnak.
    A Gyerekek és Tizenévesek csak a sajátjukat.
    """
    if user.role in ["Családfő", "Szülő"]:
        return db.query(models.Task).filter(models.Task.owner.has(family_id=user.family_id)).offset(skip).limit(limit).all()
    
    if user.role in ["Gyerek", "Tizenéves"]:
        return db.query(models.Task).filter(models.Task.owner_id == user.id).offset(skip).limit(limit).all()
    
    return []

def create_task(db: Session, task: TaskCreate):
    # A model_dump() kizárja azokat a mezőket, amik nincsenek beállítva (pl. owner)
    task_data = task.model_dump(exclude_unset=True)
    db_task = models.Task(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def toggle_task_status(db: Session, task_id: int):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        # A 'done' mező már nem létezik, a 'status'-t kellene frissíteni
        # Egyelőre ezt kikommentáljuk, amíg a teljes feladat-refaktorálást megcsináljuk
        # db_task.done = not db_task.done
        pass # Placeholder
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        db.delete(db_task)
        db.commit()
    return db_task

def get_users_by_family(db: Session, family_id: int):
    return db.query(models.User).filter(models.User.family_id == family_id).all()


def update_user(db: Session, user_id: int, user_data: UserCreate):
    db_user = get_user(db, user_id)
    if db_user:
        # Frissítjük az adatokat
        db_user.name = user_data.name
        db_user.display_name = user_data.display_name
        db_user.role = user_data.role
        # Itt lehetne emailt, avatart, stb. is frissíteni
        db.commit()
        db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user

def get_account(db: Session, account_id: int):
    return db.query(models.Account).filter(models.Account.id == account_id).first()

def get_accounts_by_family(db: Session, user: models.User):
    family_id = user.family_id
    
    # Először lekérjük a család összes kasszáját
    all_accounts = db.query(models.Account).filter(models.Account.family_id == family_id).all()
    
    # === ÚJ LOGIKA A KÖZÖS KASSZA KISZÁMÍTÁSÁHOZ ===
    # Keressük meg a szülőket és a közös kasszát
    parent_accounts = [acc for acc in all_accounts if acc.owner_user and acc.owner_user.role in ['Családfő', 'Szülő'] and acc.type == 'személyes']
    common_account = next((acc for acc in all_accounts if acc.type == 'közös'), None)
    
    # Ha van közös kassza, felülírjuk az egyenlegét a szülők személyes kasszáinak összegével
    if common_account:
        common_account.balance = sum(acc.balance for acc in parent_accounts)

    # A jogosultsági szűrés a már módosított adatokon történik
    if user.role == "Családfő":
        return all_accounts
    
    if user.role == "Szülő":
        children_ids = [member.id for member in user.family.members if member.role in ["Gyerek", "Tizenéves"]]
        
        return [
            acc for acc in all_accounts if 
            acc.type != 'személyes' or 
            acc.owner_user_id == user.id or 
            acc.owner_user_id in children_ids
        ]

    if user.role in ["Tizenéves", "Gyerek"]:
        return [acc for acc in all_accounts if acc.owner_user_id == user.id]
    
    return []




def create_family_account(db: Session, account: schemas.AccountCreate, family_id: int, owner_user_id: int | None = None):
    db_account = models.Account(
        **account.model_dump(), 
        family_id=family_id,
        owner_user_id=owner_user_id
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

def create_account_transaction(db: Session, transaction: schemas.TransactionCreate, account_id: int, user: models.User):
    db_account = get_account(db=db, account_id=account_id)
    if not db_account:
        return None

    if db_account.type == 'közös':
        raise HTTPException(status_code=400, detail="A Közös kasszához nem lehet közvetlenül tranzakciót rögzíteni.")

    can_add_transaction = False
    if user.role in ["Családfő", "Szülő"]:
        can_add_transaction = True
    elif user.role in ["Tizenéves", "Gyerek"] and db_account.owner_user_id == user.id:
        can_add_transaction = True
    
    if not can_add_transaction:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod tranzakciót hozzáadni ehhez a kasszához.")

    # JAVÍTÁS: Itt 'user_id=user.id' helyett a 'creator=user' kapcsolatot állítjuk be.
    db_transaction = models.Transaction(
        description=transaction.description,
        amount=transaction.amount,
        type=transaction.type,
        category_id=transaction.category_id,
        account_id=account_id,
        creator=user  # <-- EZ A LÉNYEG
    )
    
    if db_transaction.type == 'bevétel':
        db_account.balance += db_transaction.amount
    elif db_transaction.type == 'kiadás':
        db_account.balance -= db_transaction.amount
        
    db.add(db_transaction)
    db.add(db_account)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction
def get_category(db: Session, category_id: int):
    return db.query(models.Category).filter(models.Category.id == category_id).first()

def get_categories(db: Session):
    # Lekérdezzük az összes kategóriát és a szülő-gyerek kapcsolatokat is betöltjük
    return db.query(models.Category).filter(models.Category.parent_id == None).all()

def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(name=category.name, parent_id=category.parent_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category
def get_transactions(
    db: Session, 
    user: models.User, 
    account_id: int | None = None,
    transaction_type: str | None = None,
    search_term: str | None = None,
    sort_by: str | None = 'date_desc'
):
    visible_accounts = get_accounts_by_family(db, user=user)
    visible_account_ids = {acc.id for acc in visible_accounts}
    if not visible_account_ids:
        return []

    # JAVÍTÁS: Hozzáadjuk az .options(joinedload(...)) részt,
    # hogy a 'creator' és a 'category' adatait is azonnal betöltse a tranzakcióval.
    query = db.query(models.Transaction).options(
        joinedload(models.Transaction.creator),
        joinedload(models.Transaction.category)
    )
    
    query = query.filter(models.Transaction.account_id.in_(visible_account_ids))

    if account_id:
        if account_id not in visible_account_ids:
             return []
        query = query.filter(models.Transaction.account_id == account_id)
    
    if transaction_type:
        query = query.filter(models.Transaction.type == transaction_type)
        
    if search_term:
        query = query.filter(models.Transaction.description.ilike(f"%{search_term}%"))

    # Rendezés
    if sort_by == 'date_asc':
        query = query.order_by(models.Transaction.date.asc())
    elif sort_by == 'amount_desc':
        query = query.order_by(models.Transaction.amount.desc())
    elif sort_by == 'amount_asc':
        query = query.order_by(models.Transaction.amount.asc())
    else: # Alapértelmezett: date_desc
        query = query.order_by(models.Transaction.date.desc())

    return query.all()
def update_transaction(db: Session, transaction_id: int, transaction_data: schemas.TransactionCreate, user: models.User):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_transaction:
        return None

    # === JOGOSULTSÁG ELLENŐRZÉS ===
    if user.role not in ["Családfő", "Szülő"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a tranzakció módosításához.")

    # Visszaállítjuk a kassza egyenlegét a régi tranzakció alapján
    old_amount = db_transaction.amount
    db_account = db_transaction.account
    if db_transaction.type == 'bevétel':
        db_account.balance -= old_amount
    else: # kiadás
        db_account.balance += old_amount

    # Frissítjük a tranzakció adatait
    db_transaction.description = transaction_data.description
    db_transaction.amount = transaction_data.amount
    db_transaction.category_id = transaction_data.category_id
    db_transaction.type = transaction_data.type

    # Alkalmazzuk az új tranzakció hatását az egyenlegre
    if db_transaction.type == 'bevétel':
        db_account.balance += db_transaction.amount
    else: # kiadás
        db_account.balance -= db_transaction.amount
    
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def delete_transaction(db: Session, transaction_id: int, user: models.User):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_transaction:
        return None

    # === JOGOSULTSÁG ELLENŐRZÉS ===
    if user.role not in ["Családfő", "Szülő"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a tranzakció törléséhez.")

    # Visszaállítjuk a kassza egyenlegét a törlés előtt
    db_account = db_transaction.account
    if db_transaction.type == 'bevétel':
        db_account.balance -= db_transaction.amount
    else: # kiadás
        db_account.balance += db_transaction.amount

    db.delete(db_transaction)
    db.commit()
    return db_transaction
# === ÚJ FUNKCIÓ AZ ÁTUTALÁSHOZ ===
def create_transfer(db: Session, transfer_data: schemas.TransferCreate, user: models.User):
    if transfer_data.from_account_id == transfer_data.to_account_id:
        raise HTTPException(status_code=400, detail="A forrás és cél kassza nem lehet ugyanaz.")

    from_account = get_account(db, transfer_data.from_account_id)
    to_account = get_account(db, transfer_data.to_account_id)

    if not from_account or not to_account:
        raise HTTPException(status_code=404, detail="Egyik vagy mindkét kassza nem található.")

    can_transfer = False
    if user.role in ["Családfő", "Szülő"] or from_account.owner_user_id == user.id:
        can_transfer = True
    
    if not can_transfer:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod ebből a kasszából utalni.")

    if from_account.balance < transfer_data.amount:
        raise HTTPException(status_code=400, detail="Nincs elég fedezet a forrás kasszán.")

    transfer_id = uuid.uuid4()
    
    try:
        # JAVÍTÁS: Kifejezetten, mezőnként hozzuk létre a tranzakciókat
        # a **...dump() helyett.

        # Kiadás tranzakció
        db_expense = models.Transaction(
            description=f"Átutalás -> {to_account.name}: {transfer_data.description}",
            amount=transfer_data.amount,
            type='kiadás',
            account_id=from_account.id,
            creator=user,
            transfer_id=transfer_id
        )
        from_account.balance -= transfer_data.amount

        # Bevétel tranzakció
        db_income = models.Transaction(
            description=f"Átutalás <- {from_account.name}: {transfer_data.description}",
            amount=transfer_data.amount,
            type='bevétel',
            account_id=to_account.id,
            creator=user,
            transfer_id=transfer_id
        )
        to_account.balance += transfer_data.amount
        
        db.add_all([db_expense, db_income, from_account, to_account])
        db.commit()
        
        return {"status": "siker", "transfer_id": transfer_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Adatbázis hiba történt: {e}")

def get_all_personal_accounts(db: Session, family_id: int):
    """ Visszaadja egy család összes 'személyes' típusú kasszáját. """
    return db.query(models.Account).filter(
        models.Account.family_id == family_id,
        models.Account.type == 'személyes'
    ).all()

def get_financial_summary(db: Session, user: models.User):
    family_id = user.family_id
    current_month = datetime.now().month
    current_year = datetime.now().year

    # --- Logika Szülőknek és Családfőnek ---
    if user.role in ["Családfő", "Szülő"]:
        all_family_accounts = db.query(models.Account).filter(models.Account.family_id == family_id).all()
        
        parent_personal_accounts = [
            acc for acc in all_family_accounts 
            if acc.owner_user and acc.owner_user.role in ['Családfő', 'Szülő'] and acc.type == 'személyes'
        ]
        
        other_accounts_summary = [
            {"name": acc.name, "balance": acc.balance} 
            for acc in all_family_accounts if acc.type != 'személyes'
        ]
        
        total_parents_balance = sum(acc.balance for acc in parent_personal_accounts)

        # A statisztika a család összes tranzakciójára vonatkozik
        all_account_ids = [acc.id for acc in all_family_accounts]
        monthly_income = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.account_id.in_(all_account_ids), models.Transaction.type == 'bevétel', extract('year', models.Transaction.date) == current_year, extract('month', models.Transaction.date) == current_month).scalar() or 0.0
        monthly_expense = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.account_id.in_(all_account_ids), models.Transaction.type == 'kiadás', extract('year', models.Transaction.date) == current_year, extract('month', models.Transaction.date) == current_month).scalar() or 0.0

        return {
            "view_type": "parent",
            "balance_title": "Szülők Egyenlege",
            "total_balance": total_parents_balance,
            "other_accounts": other_accounts_summary,
            "monthly_income": monthly_income,
            "monthly_expense": monthly_expense,
            "monthly_savings": monthly_income - monthly_expense
        }

    # --- Logika Gyerekeknek és Tizenéveseknek ---
    if user.role in ["Gyerek", "Tizenéves"]:
        personal_account = db.query(models.Account).filter(models.Account.owner_user_id == user.id).first()
        
        if not personal_account:
            return {"view_type": "child", "total_balance": 0, "monthly_income": 0, "monthly_expense": 0, "monthly_savings": 0}

        # A statisztika csak a saját tranzakcióikra vonatkozik
        monthly_income = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.account_id == personal_account.id, models.Transaction.type == 'bevétel', extract('year', models.Transaction.date) == current_year, extract('month', models.Transaction.date) == current_month).scalar() or 0.0
        monthly_expense = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.account_id == personal_account.id, models.Transaction.type == 'kiadás', extract('year', models.Transaction.date) == current_year, extract('month', models.Transaction.date) == current_month).scalar() or 0.0

        return {
            "view_type": "child",
            "balance_title": "Zsebpénzem",
            "total_balance": personal_account.balance,
            "other_accounts": [],
            "monthly_income": monthly_income,
            "monthly_expense": monthly_expense,
            "monthly_savings": monthly_income - monthly_expense
        }

    return {}