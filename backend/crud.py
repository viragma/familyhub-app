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

# --- Task CRUD Műveletek (már léteznek) ---
def get_tasks(db: Session, user: models.User, skip: int = 0, limit: int = 100):
    """
    Listázza a feladatokat a felhasználó jogosultságai alapján.
    A Szülők és a Családfő minden, a családban lévő feladatot látnak.
    A Gyerekek és Tizenévesek csak a sajátjukat.
    """
    # A joinedload itt is fontos, hogy a tulajdonos adatai betöltődjenek
    query = db.query(models.Task).options(joinedload(models.Task.owner))

    if user.role in ["Családfő", "Szülő"]:
        # Lekérdezzük az összes felhasználó ID-ját, aki ugyanabban a családban van
        family_member_ids = [member.id for member in user.family.members]
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
    family_id = user.family_id
    current_month = datetime.now().month
    current_year = datetime.now().year
    visible_accounts = get_accounts_by_family(db, user=user)
    visible_account_ids = [acc.id for acc in visible_accounts]

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
        monthly_income = db.query(func.sum(models.Transaction.amount)).\
        filter(
            models.Transaction.account_id.in_(visible_account_ids),
            models.Transaction.type == 'bevétel',
            models.Transaction.transfer_id == None,
            # ... (dátum szűrők)
        ).scalar() or Decimal(0)
        monthly_expense = db.query(func.sum(models.Transaction.amount)).\
        filter(
            models.Transaction.account_id.in_(visible_account_ids),
            models.Transaction.type == 'kiadás',
            # JAVÍTÁS: VAGY sima kiadás, VAGY családi kiadásnak jelölt transzfer
            ( (models.Transaction.transfer_id == None) | (models.Transaction.is_family_expense == True) ),
            extract('year', models.Transaction.date) == current_year,
            extract('month', models.Transaction.date) == current_month
        ).scalar() or Decimal(0)

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
        monthly_income = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.account_id == personal_account.id, models.Transaction.type == 'bevétel', extract('year', models.Transaction.date) == current_year, extract('month', models.Transaction.date) == current_month).scalar() or Decimal(0)
        monthly_expense = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.account_id == personal_account.id, models.Transaction.type == 'kiadás', extract('year', models.Transaction.date) == current_year, extract('month', models.Transaction.date) == current_month).scalar() or Decimal(0)

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
    db_account = get_account_by_id_simple(db, account_id)
    if not db_account: return None
    if db_account.type in ['személyes', 'közös']:
        raise HTTPException(status_code=403, detail="Személyes és közös kasszák nem törölhetők.")
    if user.role not in ["Családfő", "Szülő"] and user.id != db_account.owner_user_id:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a kassza törléséhez.")
    if db_account.balance != 0:
        raise HTTPException(status_code=400, detail="A kassza csak akkor törölhető, ha az egyenlege 0 Ft.")
    db.delete(db_account)
    db.commit()
    return db_account

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
    """ Lekérdezi a felhasználó számára releváns célokat a dashboardra. """
    # Családi célok, amik a dashboardon jelennek meg
    family_goals = db.query(models.Account).options(joinedload(models.Account.owner_user)).filter(
        models.Account.family_id == user.family_id,
        models.Account.type == 'cél',
        models.Account.show_on_dashboard == True
    ).all()

    # A felhasználó saját, személyes céljai
    personal_goals = db.query(models.Account).options(joinedload(models.Account.owner_user)).filter(
        models.Account.type == 'cél',
        models.Account.owner_user_id == user.id,
        models.Account.show_on_dashboard == False # Csak azokat, amik nem családiak
    ).all()
    
    return {
        "family_goals": family_goals,
        "personal_goals": personal_goals
    }
