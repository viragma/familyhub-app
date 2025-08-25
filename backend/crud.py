from datetime import datetime
from decimal import Decimal
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from . import models, schemas
from fastapi import HTTPException,status
from .schemas import (
    Task as TaskSchema, TaskCreate,
    Family, FamilyCreate,
    User, UserCreate, UserProfile,Account, Transaction, TransactionCreate,TransferCreate
)
from .security import get_pin_hash
from . import models
import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload,selectinload
# JAVÍTÁS: Hozzáadjuk a hiányzó 'func' és 'extract' importokat
from sqlalchemy import func, extract
from datetime import datetime
import uuid
from . import models, schemas
from .security import get_pin_hash
from sqlalchemy import func, extract, and_, or_  # ← and_, or_ hozzáadása

# --- User CRUD Műveletek ---
def get_user(db: Session, user_id: int):
    # Eagerly load relationships needed for permissions
    return db.query(models.User).options(
        selectinload(models.User.family).selectinload(models.Family.members),
        selectinload(models.User.visible_accounts)
    ).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pin = get_pin_hash(user.pin)
    db_user = models.User(
        name=user.name, display_name=user.display_name, birth_date=user.birth_date,
        avatar_url=user.avatar_url, role=user.role, pin_hash=hashed_pin,
        family_id=user.family_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    personal_account_schema = schemas.AccountCreate(
        name=f"{db_user.display_name} kasszája", type="személyes"
    )
    create_family_account(
        db=db, account=personal_account_schema, 
        family_id=db_user.family_id, owner_user=db_user
    )
    return db_user
    
    return db_user
# --- Family CRUD Műveletek ---
def create_family(db: Session, family: schemas.FamilyCreate):
    db_family = models.Family(name=family.name)
    db.add(db_family)
    db.commit()
    db.refresh(db_family)
    return db_family



def get_tasks(db: Session, user: models.User, skip: int = 0, limit: int = 100):
    query = db.query(models.Task)

    if user.role in ["Családfő", "Szülő"]:
        # Családtagok ID-ját közvetlenül a DB-ből kérdezzük le
        family_member_ids = db.query(models.User.id).filter(
            models.User.family_id == user.family_id
        ).all()
        family_member_ids = [member_id[0] for member_id in family_member_ids]
        
        return query.filter(models.Task.owner_id.in_(family_member_ids)).offset(skip).limit(limit).all()
    
    elif user.role in ["Gyerek", "Tizenéves"]:
        # A gyerekek csak a saját feladataikat látják
        return query.filter(models.Task.owner_id == user.id).offset(skip).limit(limit).all()
    
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


def update_user(db: Session, user_id: int, user_data: schemas.UserCreate):
    db_user = get_user(db, user_id)
    if db_user:
        db_user.name = user_data.name
        db_user.display_name = user_data.display_name
        db_user.role = user_data.role
        db.commit()
        db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user

def get_account(db: Session, account_id: int, user: models.User):
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if account:
        visible_accounts = get_accounts_by_family(db, user=user)
        if account not in visible_accounts:
            raise HTTPException(status_code=403, detail="Nincs jogosultságod megtekinteni ezt a kasszát.")
    return account

def get_accounts_by_family(db: Session, user: models.User):
    query_options = joinedload(models.Account.owner_user)
    
    if user.role == "Családfő":
        accounts = db.query(models.Account).options(query_options).filter(models.Account.family_id == user.family_id).all()
    elif user.role == "Szülő":
        children_ids = [
            member.id for member in user.family.members 
            if member.role in ["Gyerek", "Tizenéves"]
        ]
        
        accounts = db.query(models.Account).options(query_options).filter(
            models.Account.family_id == user.family_id,
            (
                (models.Account.type != 'személyes') |
                (models.Account.owner_user_id == user.id) |
                (models.Account.owner_user_id.in_(children_ids))
            )
        ).all()
        
        shared_with_me = [acc for acc in user.visible_accounts if acc not in accounts]
        accounts.extend(shared_with_me)

    else: # Gyerek vagy Tizenéves nézet
        accounts = list(user.visible_accounts)
    
    common_account = next((acc for acc in accounts if acc.type == 'közös'), None)
    if common_account and user.role in ["Családfő", "Szülő"]:
        all_family_accounts = db.query(models.Account).filter(models.Account.family_id == user.family_id).all()
        parent_personal_accounts = [acc for acc in all_family_accounts if acc.owner_user and acc.owner_user.role in ['Családfő', 'Szülő'] and acc.type == 'személyes']
        common_account.balance = sum(acc.balance for acc in parent_personal_accounts)
        
    return accounts

def create_family_account(db: Session, account: schemas.AccountCreate, family_id: int, owner_user: models.User):
    db_account = models.Account(
        name=account.name, type=account.type, goal_amount=account.goal_amount,
        goal_date=account.goal_date, show_on_dashboard=account.show_on_dashboard,
        family_id=family_id,
        owner_user_id=owner_user.id if account.type != 'közös' else None
    )
    
    db_account.viewers.append(owner_user)

    if owner_user.role in ['Gyerek', 'Tizenéves']:
        parents = db.query(models.User).filter(
            models.User.family_id == family_id,
            models.User.role.in_(['Szülő', 'Családfő'])
        ).all()
        for parent in parents:
            if parent not in db_account.viewers:
                db_account.viewers.append(parent)
    
    if account.viewer_ids:
        viewers = db.query(models.User).filter(models.User.id.in_(account.viewer_ids)).all()
        for viewer in viewers:
            if viewer not in db_account.viewers:
                db_account.viewers.append(viewer)
                
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

def create_account_transaction(db: Session, transaction: schemas.TransactionCreate, account_id: int, user: models.User):
    # Lekérdezzük a kasszát, és a jogosultságot is ellenőrizzük a 'user' alapján
    db_account = get_account(db=db, account_id=account_id, user=user)
    if not db_account:
        raise HTTPException(status_code=404, detail="Kassza nem található vagy nincs jogosultságod hozzá.")

    # Védelmi szabályok
    if db_account.type in ['közös', 'cél']:
        raise HTTPException(status_code=400, detail="Ehhez a kasszához csak utalással lehet pénzt mozgatni.")

    # Jogosultság ellenőrzése
    can_add_transaction = False
    is_parent_managing_child = user.role in ["Családfő", "Szülő"] and db_account.owner_user and db_account.owner_user.role in ["Gyerek", "Tizenéves"]
    if (user.role in ["Családfő", "Szülő"] and (db_account.owner_user_id == user.id or is_parent_managing_child)):
        can_add_transaction = True
    elif user.role in ["Tizenéves", "Gyerek"] and db_account.owner_user_id == user.id:
        can_add_transaction = True
    
    if not can_add_transaction:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod tranzakciót hozzáadni ehhez a kasszához.")

    # JAVÍTÁS: Kifejezetten, mezőnként hozzuk létre a tranzakciót
    db_transaction = models.Transaction(
        description=transaction.description,
        amount=transaction.amount,
        type=transaction.type,
        category_id=transaction.category_id,
        account_id=account_id,
        creator=user
    )
    
    # Egyenleg frissítése
    if db_transaction.type == 'bevétel':
        db_account.balance += db_transaction.amount
    elif db_transaction.type == 'kiadás':
        db_account.balance -= db_transaction.amount
        
    # Mentés az adatbázisba
    db.add(db_transaction)
    db.add(db_account)
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction
def get_categories(db: Session):
    """
    Egyszerű kategória lista - circular reference nélkül
    """
    categories = db.query(models.Category).all()
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "parent_id": cat.parent_id,
            "color": cat.color,
            "icon": cat.icon,
            "has_children": db.query(models.Category).filter(models.Category.parent_id == cat.id).count() > 0
        }
        for cat in categories
    ]

def get_categories_tree(db: Session):
    """
    Fa struktúra - csak amikor tényleg kell
    """
    all_categories = db.query(models.Category).all()
    
    categories_dict = []
    for category in all_categories:
        category_dict = {
            "id": category.id,
            "name": category.name,
            "parent_id": category.parent_id,
            "color": category.color,
            "icon": category.icon,
            "children": []
        }
        categories_dict.append(category_dict)
    
    category_map = {cat["id"]: cat for cat in categories_dict}
    
    tree = []
    for cat_dict in categories_dict:
        if cat_dict["parent_id"]:
            parent = category_map.get(cat_dict["parent_id"])
            if parent:
                parent["children"].append(cat_dict)
        else:
            tree.append(cat_dict)
    
    return tree

def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(**category.model_dump())
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
        
    # JAVÍTÁS: Átadjuk a 'user' objektumot a jogosultság-ellenőrzéshez mindkét hívásnál
    from_account = get_account(db, transfer_data.from_account_id, user=user) 
    to_account = get_account(db, transfer_data.to_account_id, user=user)

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
    is_pocket_money = False
    if from_account.owner_user and to_account.owner_user:
        if from_account.owner_user.role in ["Családfő", "Szülő"] and to_account.owner_user.role in ["Gyerek", "Tizenéves"]:
            is_pocket_money = True
            
    try:
        db_expense = models.Transaction(
            description=f"Átutalás -> {to_account.name}: {transfer_data.description}", 
            amount=transfer_data.amount,
            type='kiadás', 
            account_id=from_account.id, 
            creator=user, 
            transfer_id=transfer_id, 
            is_family_expense=is_pocket_money
        )
        from_account.balance -= transfer_data.amount

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
    # === JAVÍTOTT JOGOSULTSÁGI SZABÁLY ===
    can_transfer = False
    is_owner = from_account.owner_user_id == user.id
    is_parent = user.role in ["Családfő", "Szülő"]

    # Utalhatsz, ha szülő vagy, VAGY ha a tiéd a kassza (legyen az személyes vagy cél).
    if is_parent or is_owner:
        can_transfer = True
    
    if not can_transfer:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod ebből a kasszából utalni.")
        
    if from_account.balance < transfer_data.amount:
        raise HTTPException(status_code=400, detail="Nincs elég fedezet a forrás kasszán.")
        
    transfer_id = uuid.uuid4()
    is_pocket_money = False
    if from_account.owner_user and to_account.owner_user:
        if from_account.owner_user.role in ["Családfő", "Szülő"] and to_account.owner_user.role in ["Gyerek", "Tizenéves"]:
            is_pocket_money = True
            
    try:
        db_expense = models.Transaction(
            description=f"Átutalás -> {to_account.name}: {transfer_data.description}", 
            amount=transfer_data.amount,
            type='kiadás', 
            account_id=from_account.id, 
            creator=user, 
            transfer_id=transfer_id, 
            is_family_expense=is_pocket_money
        )
        from_account.balance -= transfer_data.amount

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
    return db.query(models.Account).filter(
        models.Account.family_id == family_id,
        models.Account.type != 'közös'
    ).all()
def get_financial_summary(db: Session, user: models.User):
    """
    Kiszámolja a pénzügyi összegzést a Dashboard kártya számára a helyes, új logika alapján.
    """
    current_month = datetime.now().month
    current_year = datetime.now().year

    # Szerepkör-alapú szűrők definiálása
    if user.role in ["Családfő", "Szülő"]:
        # SZÜLŐI NÉZET
        parent_roles = ["Családfő", "Szülő"]
        parent_ids = [u.id for u in db.query(models.User.id).filter(models.User.family_id == user.family_id, models.User.role.in_(parent_roles)).all()]
        
        # A szülők egyenlege CSAK a személyes kasszáik összege
        total_balance = db.query(func.sum(models.Account.balance)).filter(
            models.Account.owner_user_id.in_(parent_ids),
            models.Account.type == 'személyes'
        ).scalar() or Decimal(0)

        # Havi bevétel: csak a külső forrásból származó
        monthly_income = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.account_id.in_(db.query(models.Account.id).filter(models.Account.owner_user_id.in_(parent_ids))),
            models.Transaction.type == 'bevétel',
            models.Transaction.transfer_id == None,
            extract('year', models.Transaction.date) == current_year,
            extract('month', models.Transaction.date) == current_month
        ).scalar() or Decimal(0)

        # Havi kiadás: külső kiadás VAGY zsebpénz
        monthly_expense = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.account_id.in_(db.query(models.Account.id).filter(models.Account.owner_user_id.in_(parent_ids))),
            models.Transaction.type == 'kiadás',
            or_(
                models.Transaction.transfer_id == None,
                models.Transaction.is_family_expense == True
            ),
            extract('year', models.Transaction.date) == current_year,
            extract('month', models.Transaction.date) == current_month
        ).scalar() or Decimal(0)

        return {
            "view_type": "parent", "balance_title": "Szülők közös egyenlege",
            "total_balance": float(total_balance), "monthly_income": float(monthly_income),
            "monthly_expense": float(monthly_expense), "monthly_savings": float(monthly_income - monthly_expense)
        }
    else:
        # GYEREK NÉZET
        personal_account = db.query(models.Account).filter(models.Account.owner_user_id == user.id).first()
        if not personal_account:
            return {"view_type": "child", "balance_title": "Zsebpénzem", "total_balance": 0, "monthly_income": 0, "monthly_expense": 0, "monthly_savings": 0}

        total_balance = personal_account.balance

        # Havi bevétel: minden, ami bejön (zsebpénz is)
        monthly_income = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.account_id == personal_account.id,
            models.Transaction.type == 'bevétel',
            extract('year', models.Transaction.date) == current_year,
            extract('month', models.Transaction.date) == current_month
        ).scalar() or Decimal(0)

        # Havi kiadás: minden, ami kimegy
        monthly_expense = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.account_id == personal_account.id,
            models.Transaction.type == 'kiadás',
            extract('year', models.Transaction.date) == current_year,
            extract('month', models.Transaction.date) == current_month
        ).scalar() or Decimal(0)

        return {
            "view_type": "child", "balance_title": "Zsebpénzem",
            "total_balance": float(total_balance), "monthly_income": float(monthly_income),
            "monthly_expense": float(monthly_expense), "monthly_savings": float(monthly_income - monthly_expense)
        }

def update_category(db: Session, category_id: int, category_data: schemas.CategoryCreate):
    db_category = get_category(db, category_id)
    if db_category:
        db_category.name = category_data.name
        db_category.color = category_data.color
        db_category.icon = category_data.icon
        db.commit()
        db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int):
    db_category = get_category(db, category_id)
    if db_category:
        db.delete(db_category)
        db.commit()
    return db_category

# ... (a meglévő importok és függvények)

def update_account(db: Session, account_id: int, account_data: schemas.AccountCreate, user: models.User):
    db_account = get_account_by_id_simple(db, account_id)
    if not db_account: return None
    if user.role not in ["Családfő", "Szülő"] and user.id != db_account.owner_user_id:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a kassza módosításához.")
    if db_account.type in ['személyes', 'közös']:
        raise HTTPException(status_code=403, detail="Személyes és közös kasszák nem módosíthatók.")
    
    db_account.name = account_data.name
    db_account.goal_amount = account_data.goal_amount
    db_account.goal_date = account_data.goal_date
    db_account.show_on_dashboard = account_data.show_on_dashboard
    
    db_account.viewers = [viewer for viewer in db_account.viewers if viewer.id == db_account.owner_user_id]
    if account_data.viewer_ids:
        viewers = db.query(models.User).filter(models.User.id.in_(account_data.viewer_ids)).all()
        for viewer in viewers:
            if viewer not in db_account.viewers:
                db_account.viewers.append(viewer)
    db.commit()
    db.refresh(db_account)
    return db_account

def delete_account(db: Session, account_id: int, user: models.User):
    """
    Kassza törlése - most ellenőrzi a függőségeket
    """
    db_account = get_account_by_id_simple(db, account_id)
    if not db_account: 
        return None
        
    # Alap jogosultság ellenőrzések
    if db_account.type in ['személyes', 'közös']:
        raise HTTPException(status_code=403, detail="Személyes és közös kasszák nem törölhetők.")
    if user.role not in ["Családfő", "Szülő"] and user.id != db_account.owner_user_id:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a kassza törléséhez.")
    if db_account.balance != 0:
        raise HTTPException(status_code=400, detail="A kassza csak akkor törölhető, ha az egyenlege 0 Ft.")

    # ✅ ÚJ: ELLENŐRIZZÜK A FÜGGŐSÉGEKET
    
    # 1. Recurring Rules ellenőrzése
    dependent_rules = db.query(models.RecurringRule).filter(
        (models.RecurringRule.from_account_id == account_id) |
        (models.RecurringRule.to_account_id == account_id)
    ).all()
    
    if dependent_rules:
        rule_descriptions = [rule.description for rule in dependent_rules[:3]]  # Max 3 példa
        if len(dependent_rules) > 3:
            rule_descriptions.append(f"... és még {len(dependent_rules) - 3} szabály")
            
        raise HTTPException(
            status_code=400, 
            detail=f"A kassza nem törölhető, mert {len(dependent_rules)} ismétlődő szabály használja: {', '.join(rule_descriptions)}"
        )
    
    # 2. Transactions ellenőrzése (ha vannak)
    transaction_count = db.query(models.Transaction).filter(
        models.Transaction.account_id == account_id
    ).count()
    
    if transaction_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"A kassza nem törölhető, mert {transaction_count} tranzakció tartozik hozzá. Előbb töröld a tranzakciókat."
        )

    # ✅ HA MINDEN OK, TÖRÖLJÜK
    try:
        db.delete(db_account)
        db.commit()
        return db_account
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Adatbázis hiba a törlés során: {str(e)}"
        )

def get_account_by_id_simple(db: Session, account_id: int):
    return db.query(models.Account).filter(models.Account.id == account_id).first()

def update_account_viewer(db: Session, account_id: int, viewer_id: int, owner: models.User, add: bool):
    # Ellenőrizzük, hogy a kassza létezik-e és a kérést küldő felhasználó-e a tulajdonosa
    db_account = db.query(models.Account).filter(models.Account.id == account_id, models.Account.owner_user_id == owner.id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Saját kassza nem található, vagy nincs jogosultságod a módosításhoz.")

    # Ellenőrizzük, hogy a megosztani kívánt felhasználó létezik-e
    viewer_user = get_user(db, viewer_id)
    if not viewer_user:
        raise HTTPException(status_code=404, detail="A megosztani kívánt felhasználó nem található.")

    if add:
        # Hozzáadás: csak akkor adjuk hozzá, ha még nincs a listán
        if viewer_user not in db_account.viewers:
            db_account.viewers.append(viewer_user)
            print(f"Adding {viewer_user.name} to viewers of account {db_account.name}")
    else:
        # Eltávolítás: csak akkor vesszük el, ha már a listán van
        if viewer_user in db_account.viewers:
            db_account.viewers.remove(viewer_user)
            print(f"Removing {viewer_user.name} from viewers of account {db_account.name}")
    
    db.commit()
    return db_account

# --- Category CRUD ---
def get_category(db: Session, category_id: int):
    return db.query(models.Category).filter(models.Category.id == category_id).first()

def get_categories(db: Session):
    all_categories = db.query(models.Category).all()
    category_map = {category.id: category for category in all_categories}
    tree = []
    for category in all_categories:
        if category.parent_id:
            parent = category_map.get(category.parent_id)
            if parent:
                if not hasattr(parent, 'children'):
                    parent.children = []
                parent.children.append(category)
        else:
            tree.append(category)
    return tree

def create_recurring_rule(db: Session, rule: schemas.RecurringRuleCreate, user: models.User):
    # A 'next_run_date'-et a start_date alapján számoljuk ki
    db_rule = models.RecurringRule(
        **rule.model_dump(),
        owner_id=user.id,
        next_run_date=rule.start_date 
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def get_all_transfer_targets(db: Session, family_id: int):
    """ 
    Visszaadja egy család összes olyan kasszáját, ami lehet egy átutalás célpontja
    (vagyis minden, ami NEM a "Közös Kassza").
    """
    return db.query(models.Account).filter(
        models.Account.family_id == family_id,
        models.Account.type != 'közös'
    ).all()

def get_valid_transfer_targets(db: Session, user: models.User):
    """
    Visszaadja azokat a kasszákat, amik egy adott felhasználó számára
    érvényes átutalási célpontok lehetnek.
    """
    # 1. A család összes SZEMÉLYES kasszája mindig célpont lehet.
    all_personal_accounts = db.query(models.Account).filter(
        models.Account.family_id == user.family_id,
        models.Account.type == 'személyes'
    ).all()

    # 2. Ezen felül a felhasználó által LÁTHATÓ összes Cél- és Vészkassza.
    visible_other_accounts = [
        acc for acc in user.visible_accounts 
        if acc.type in ['cél', 'vész']
    ]
    
    # 3. Összefűzzük a két listát, elkerülve a duplikációkat.
    combined_list = list(all_personal_accounts)
    account_ids = {acc.id for acc in combined_list}

    for acc in visible_other_accounts:
        if acc.id not in account_ids:
            combined_list.append(acc)
            
    return combined_list

def get_recurring_rules(db: Session, user: models.User):
    # A felhasználó a saját szabályait, a szülők pedig a család összes szabályát láthatják
    if user.role in ["Családfő", "Szülő"]:
        family_members_ids = [member.id for member in user.family.members]
        return db.query(models.RecurringRule).filter(models.RecurringRule.owner_id.in_(family_members_ids)).all()
    else:
        return db.query(models.RecurringRule).filter(models.RecurringRule.owner_id == user.id).all()

def update_recurring_rule(db: Session, rule_id: int, rule_data: schemas.RecurringRuleCreate, user: models.User):
    db_rule = db.query(models.RecurringRule).filter(models.RecurringRule.id == rule_id).first()
    # Jogosultság ellenőrzése (csak a tulajdonos vagy szülő módosíthat)
    if not db_rule or (db_rule.owner_id != user.id and user.role not in ["Családfő", "Szülő"]):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a szabály módosításához.")
    
    for key, value in rule_data.model_dump().items():
        setattr(db_rule, key, value)
    
    db.commit()
    db.refresh(db_rule)
    return db_rule

def delete_recurring_rule(db: Session, rule_id: int, user: models.User):
    db_rule = db.query(models.RecurringRule).filter(models.RecurringRule.id == rule_id).first()
    if not db_rule or (db_rule.owner_id != user.id and user.role not in ["Családfő", "Szülő"]):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a szabály törléséhez.")
    db.delete(db_rule)
    db.commit()
    return db_rule
def toggle_rule_status(db: Session, rule_id: int, user: models.User):
    db_rule = db.query(models.RecurringRule).filter(models.RecurringRule.id == rule_id).first()
    if not db_rule or (db_rule.owner_id != user.id and user.role not in ["Családfő", "Szülő"]):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a szabály módosításához.")
    
    db_rule.is_active = not db_rule.is_active
    db.commit()
    db.refresh(db_rule)
    return db_rule
def get_dashboard_goals(db: Session, user: models.User):

    family_goals = db.query(models.Account).filter(
        models.Account.family_id == user.family_id,
        models.Account.type == 'cél',
        models.Account.show_on_dashboard == True
    ).all()

    personal_goals = db.query(models.Account).filter(
        models.Account.type == 'cél',
        models.Account.owner_user_id == user.id,
        models.Account.show_on_dashboard == False
    ).all()
    
    return {
        "family_goals": family_goals,
        "personal_goals": personal_goals
    }

def delete_account_with_dependencies(db: Session, account_id: int, user: models.User, force: bool = False):
    """
    Kassza törlése a függőségekkel együtt (OPCIONÁLIS)
    """
    db_account = get_account_by_id_simple(db, account_id)
    if not db_account: 
        return None
        
    # Alap ellenőrzések...
    if db_account.type in ['személyes', 'közös']:
        raise HTTPException(status_code=403, detail="Személyes és közös kasszák nem törölhetők.")
    if user.role not in ["Családfő", "Szülő"] and user.id != db_account.owner_user_id:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a kassza törléséhez.")
    if db_account.balance != 0:
        raise HTTPException(status_code=400, detail="A kassza csak akkor törölhető, ha az egyenlege 0 Ft.")

    # Ha force=False, csak ellenőrzés
    if not force:
        # Számoljuk meg a függőségeket
        dependent_rules = db.query(models.RecurringRule).filter(
            (models.RecurringRule.from_account_id == account_id) |
            (models.RecurringRule.to_account_id == account_id)
        ).all()
        
        transaction_count = db.query(models.Transaction).filter(
            models.Transaction.account_id == account_id
        ).count()
        
        if dependent_rules or transaction_count > 0:
            return {
                "can_delete": False,
                "dependencies": {
                    "recurring_rules": len(dependent_rules),
                    "transactions": transaction_count
                },
                "message": f"A kassza törléséhez előbb {len(dependent_rules)} ismétlődő szabály és {transaction_count} tranzakció törlése szükséges."
            }
    
    # Ha force=True, töröljük a függőségeket is
    try:
        # 1. Recurring rules törlése
        dependent_rules = db.query(models.RecurringRule).filter(
            (models.RecurringRule.from_account_id == account_id) |
            (models.RecurringRule.to_account_id == account_id)
        ).all()
        
        for rule in dependent_rules:
            db.delete(rule)
        
        # 2. Transactions törlése (csak ha szükséges)
        transactions = db.query(models.Transaction).filter(
            models.Transaction.account_id == account_id
        ).all()
        
        for trans in transactions:
            db.delete(trans)
        
        # 3. Account törlése
        db.delete(db_account)
        db.commit()
        
        return {
            "can_delete": True,
            "deleted": {
                "recurring_rules": len(dependent_rules),
                "transactions": len(transactions),
                "account": True
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Adatbázis hiba a törlés során: {str(e)}"
        )
def get_category_spending_analytics(
    db: Session, 
    user: models.User, 
    month: int = None, 
    year: int = None
):
    """
    Kategória költések lekérdezése - dashboard kártyához
    """
    try:
        from datetime import datetime
        
        # Ha nincs megadva hónap/év, akkor aktuális
        if not month:
            month = datetime.now().month
        if not year:
            year = datetime.now().year
            
        # Felhasználó szerepkör alapú kassza szűrés
        if user.role in ["Családfő", "Szülő"]:
            family_accounts = db.query(models.Account).filter(
                models.Account.family_id == user.family_id
            ).all()
            visible_account_ids = [acc.id for acc in family_accounts]
        else:
            personal_account = db.query(models.Account).filter(
                models.Account.owner_user_id == user.id,
                models.Account.type == 'személyes'
            ).first()
            visible_account_ids = [personal_account.id] if personal_account else []
        
        if not visible_account_ids:
            return []
            
        # Egyszerűsített kategóriás költések lekérdezés
        category_stats = db.query(
            models.Category.name.label('name'),
            func.sum(models.Transaction.amount).label('amount'),
            func.count(models.Transaction.id).label('transactionCount')
        ).join(
            models.Transaction, models.Transaction.category_id == models.Category.id
        ).filter(
            models.Transaction.account_id.in_(visible_account_ids),
            models.Transaction.type == 'kiadás',
            extract('month', models.Transaction.date) == month,
            extract('year', models.Transaction.date) == year
        ).group_by(
            models.Category.id, models.Category.name
        ).order_by(
            func.sum(models.Transaction.amount).desc()
        ).limit(10).all()
        
        return [
            {
                "name": stat.name,
                "amount": float(stat.amount),
                "transactionCount": stat.transactionCount
            }
            for stat in category_stats
        ]
        
    except Exception as e:
        print(f"Category analytics error: {e}")
        return []

def get_category_spending_analytics(
    db: Session, user: models.User, month: int = None, year: int = None
):
    try:
        if not month: month = datetime.now().month
        if not year: year = datetime.now().year
            
        visible_account_ids = _get_analytics_account_ids(db, user)
        if not visible_account_ids: return []
            
        expense_filter = and_(
            models.Transaction.type == 'kiadás',
            extract('month', models.Transaction.date) == month,
            extract('year', models.Transaction.date) == year
        )
        if user.role in ["Családfő", "Szülő"]:
             expense_filter = and_(expense_filter, or_(
                models.Transaction.transfer_id == None,
                models.Transaction.is_family_expense == True
            ))

        category_stats = db.query(
            models.Category.name.label('name'),
            models.Category.color.label('color'),
            func.sum(models.Transaction.amount).label('amount'),
            func.count(models.Transaction.id).label('transactionCount')
        ).join(
            models.Transaction, models.Transaction.category_id == models.Category.id
        ).filter(models.Transaction.account_id.in_(visible_account_ids), expense_filter).group_by(
            models.Category.id, models.Category.name, models.Category.color
        ).order_by(
            func.sum(models.Transaction.amount).desc()
        ).limit(10).all()
        
        return [
            {"name": stat.name, "color": stat.color or '#cccccc', "amount": float(stat.amount), "transactionCount": stat.transactionCount}
            for stat in category_stats
        ]
    except Exception as e:
        print(f"Category analytics error: {e}")
        return []

def get_savings_trend_analytics(db: Session, user: models.User, year: int = None):
    """
    JAVÍTOTT: Most már csak az aktuális hónapig (bezárólag) kéri le az adatokat,
    így a Dashboard kártya mindig a valós aktuális hónapot mutatja.
    """
    try:
        current_dt = datetime.now()
        if not year:
            year = current_dt.year
        
        # Meghatározzuk, hogy meddig kell a ciklusnak futnia
        end_month = 12
        if year == current_dt.year:
            end_month = current_dt.month

        visible_account_ids = _get_analytics_account_ids(db, user)
        if not visible_account_ids: return []
            
        months = []
        # A ciklus már csak a releváns hónapokig fut
        for month in range(1, end_month + 1):
            if user.role in ["Családfő", "Szülő"]:
                income_filter = and_(models.Transaction.type == 'bevétel', models.Transaction.transfer_id == None)
                expense_filter = and_(models.Transaction.type == 'kiadás', or_(models.Transaction.transfer_id == None, models.Transaction.is_family_expense == True))
            else:
                income_filter = and_(models.Transaction.type == 'bevétel')
                expense_filter = and_(models.Transaction.type == 'kiadás')

            monthly_income = db.query(func.sum(models.Transaction.amount)).filter(
                models.Transaction.account_id.in_(visible_account_ids),
                extract('month', models.Transaction.date) == month,
                extract('year', models.Transaction.date) == year,
                income_filter
            ).scalar() or 0
            
            monthly_expense = db.query(func.sum(models.Transaction.amount)).filter(
                models.Transaction.account_id.in_(visible_account_ids),
                extract('month', models.Transaction.date) == month,
                extract('year', models.Transaction.date) == year,
                expense_filter
            ).scalar() or 0
            
            savings = float(monthly_income) - float(monthly_expense)
            months.append({"month": f"{year}.{month:02d}", "savings": savings, "income": float(monthly_income), "expenses": float(monthly_expense)})
            
        return months
    except Exception as e:
        print(f"Savings trend analytics error: {e}")
        return []

def get_detailed_category_analytics(
    db: Session, 
    user: models.User, 
    start_date: str, 
    end_date: str,
    category_ids: list = None
):
    try:
        visible_account_ids = _get_analytics_account_ids(db, user)
        
        if not visible_account_ids:
            return {"categories": [], "subcategories": []}

        base_filter = and_(
            models.Transaction.account_id.in_(visible_account_ids),
            models.Transaction.type == 'kiadás',
            models.Transaction.date >= start_date,
            models.Transaction.date <= end_date,
        )
        if user.role in ["Családfő", "Szülő"]:
             base_filter = and_(base_filter, or_(
                models.Transaction.transfer_id == None,
                models.Transaction.is_family_expense == True
            ))

        query = db.query(
            models.Category.name.label('name'),
            models.Category.color.label('color'),
            func.sum(models.Transaction.amount).label('amount'),
            func.count(models.Transaction.id).label('transactionCount')
        ).join(
            models.Transaction, models.Transaction.category_id == models.Category.id
        ).filter(base_filter)
        
        if category_ids:
            query = query.filter(models.Category.id.in_(category_ids))
            
        category_stats = query.filter(
            models.Category.parent_id == None
        ).group_by(
            models.Category.id, models.Category.name, models.Category.color
        ).order_by(
            func.sum(models.Transaction.amount).desc()
        ).all()
        
        
        subcategory_stats = query.filter(
            models.Category.parent_id != None
        ).group_by(
            models.Category.id, models.Category.name, models.Category.color
        ).order_by(
            func.sum(models.Transaction.amount).desc()
        ).all()
        
        return {
            "categories": [
                {
                    "name": stat.name,
                    "color": stat.color or '#cccccc',
                    "amount": float(stat.amount),
                    "transactionCount": stat.transactionCount
                }
                for stat in category_stats
            ],
            "subcategories": [
                {
                    "name": stat.name,
                    "color": stat.color or '#cccccc',
                    "amount": float(stat.amount),
                    "transactionCount": stat.transactionCount
                }
                for stat in subcategory_stats
            ]
        }
        
    except Exception as e:
        print(f"Detailed category analytics error: {e}")
        return {"categories": [], "subcategories": []}

def get_detailed_savings_analytics(
    db: Session, user: models.User, start_date: str, end_date: str
):
    """
    JAVÍTOTT: Most már ez a függvény is a helyes, szerepkör-alapú logikát használja.
    """
    try:
        visible_account_ids = _get_analytics_account_ids(db, user)
        if not visible_account_ids: return []
            
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        
        results = []
        current = start.replace(day=1)
        
        while current <= end:
            # Szerepkör-specifikus szűrők
            if user.role in ["Családfő", "Szülő"]:
                income_filter = and_(models.Transaction.type == 'bevétel', models.Transaction.transfer_id == None)
                expense_filter = and_(models.Transaction.type == 'kiadás', or_(models.Transaction.transfer_id == None, models.Transaction.is_family_expense == True))
            else:
                income_filter = and_(models.Transaction.type == 'bevétel')
                expense_filter = and_(models.Transaction.type == 'kiadás')
            
            monthly_income = db.query(func.sum(models.Transaction.amount)).filter(
                models.Transaction.account_id.in_(visible_account_ids),
                extract('month', models.Transaction.date) == current.month,
                extract('year', models.Transaction.date) == current.year,
                income_filter
            ).scalar() or 0
            
            monthly_expense = db.query(func.sum(models.Transaction.amount)).filter(
                models.Transaction.account_id.in_(visible_account_ids),
                extract('month', models.Transaction.date) == current.month,
                extract('year', models.Transaction.date) == current.year,
                expense_filter
            ).scalar() or 0
            
            savings = float(monthly_income) - float(monthly_expense)
            results.append({"month": current.strftime('%Y.%m'), "savings": savings, "income": float(monthly_income), "expenses": float(monthly_expense)})
            
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
                
        return results
    except Exception as e:
        print(f"Detailed savings analytics error: {e}")
        return []


def _get_analytics_account_ids(db: Session, user: models.User) -> list[int]:
    """
    Kifejezetten analitikai célokra adja vissza a releváns kasszák azonosítóit.
    - Szülők/Családfő: Csak a saját személyes, a közös, a cél- és a vészkasszákat veszi figyelembe.
                      A gyerekek személyes kasszáit kihagyja az összesítésből.
    - Gyerekek/Tizenévesek: Csak a számukra látható kasszákat adja vissza (jellemzően a sajátjukat).
    """
    if user.role in ["Családfő", "Szülő"]:
        parent_roles = ["Családfő", "Szülő"]
        
        parent_ids_query = db.query(models.User.id).filter(
            models.User.family_id == user.family_id,
            models.User.role.in_(parent_roles)
        )
        parent_ids = [pid[0] for pid in parent_ids_query.all()]

        accounts_query = db.query(models.Account.id).filter(
            models.Account.family_id == user.family_id,
            or_(
                models.Account.type.in_(['közös', 'cél', 'vész']),
                models.Account.owner_user_id.in_(parent_ids)
            )
        )
        return [acc_id[0] for acc_id in accounts_query.all()]
    else:
        return [acc.id for acc in user.visible_accounts]
