from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import func, extract, and_, or_
from sqlalchemy.orm import Session, joinedload, selectinload, aliased
from . import models, schemas
from .security import get_pin_hash
import uuid
from fastapi import HTTPException,status
from .schemas import (
    Task as TaskSchema, TaskCreate,
    Family, FamilyCreate,
    User, UserCreate, UserProfile,Account, Transaction, TransactionCreate,TransferCreate,ExpectedExpense,ExpectedExpenseCreate,
    UpcomingEvent, AccountCreate
    )
import base64
import os
from dateutil.relativedelta import relativedelta

from typing import Optional, List
from sqlalchemy.dialects.postgresql import insert

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

# === EZ A FÜGGVÉNY MÓDOSUL ===
def get_account(db: Session, account_id: int, user: models.User):
    account = db.query(models.Account).options(
        selectinload(models.Account.wishes).selectinload(models.Wish.owner),
        selectinload(models.Account.wishes).selectinload(models.Wish.category)
    ).filter(models.Account.id == account_id).first()
    
    if account:
        visible_accounts = get_accounts_by_family(db, user=user)
        is_visible = any(acc.id == account.id for acc in visible_accounts)
        
        if not is_visible:
            raise HTTPException(status_code=403, detail="Nincs jogosultságod megtekinteni ezt a kasszát.")
            
    return account

def get_accounts_by_family(db: Session, user: models.User, account_type: Optional[str] = None):
    """
    Listázza a kasszákat a felhasználó jogosultságai alapján.
    Képes szűrni kassza típusra is (`account_type`).
    """
    # A láthatósági logika alapja ugyanaz marad
    query_options = joinedload(models.Account.owner_user)
    
    # ... (a jogosultsági logika innen változatlan)
    if user.role == "Családfő":
        accounts_query = db.query(models.Account).options(query_options).filter(models.Account.family_id == user.family_id)
    elif user.role == "Szülő":
        children_ids_query = db.query(models.User.id).filter(
            models.User.family_id == user.family_id,
            models.User.role.in_(["Gyerek", "Tizenéves"])
        )
        children_ids = [row[0] for row in children_ids_query.all()]
        
        accounts_query = db.query(models.Account).options(query_options).filter(
            models.Account.family_id == user.family_id,
            (
                (models.Account.type != 'személyes') |
                (models.Account.owner_user_id == user.id) |
                (models.Account.owner_user_id.in_(children_ids))
            )
        )
    else: # Gyerek vagy Tizenéves
        # A gyerekek csak a számukra explicit módon látható kasszákat látják
        account_ids = [acc.id for acc in user.visible_accounts]
        accounts_query = db.query(models.Account).options(query_options).filter(models.Account.id.in_(account_ids))

    # --- EZ AZ ÚJ RÉSZ ---
    # Ha a híváskor megadtak típust, itt alkalmazzuk a szűrést
    if account_type:
        accounts_query = accounts_query.filter(models.Account.type == account_type)
    # ----------------------
    
    accounts = accounts_query.all()

    # A megosztott kasszák hozzáadása (szülők esetén)
    if user.role == "Szülő":
        shared_query = db.query(models.Account).join(account_visibility_association).filter(
            account_visibility_association.c.user_id == user.id
        ).options(query_options)
        
        if account_type:
            shared_query = shared_query.filter(models.Account.type == account_type)

        shared_accounts = shared_query.all()
        
        # Duplikációk elkerülése
        account_ids = {acc.id for acc in accounts}
        for acc in shared_accounts:
            if acc.id not in account_ids:
                accounts.append(acc)

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

def get_next_month_forecast(db: Session, user: models.User):
    """
    Kiszámolja a következő naptári hónap pénzügyi előrejelzését.
    Szülők esetén külön számolja a személyes és a családi (csak szülői) előrejelzést.
    """
    today = date.today()
    next_month_date = today + relativedelta(months=1)
    next_month = next_month_date.month
    next_month_year = next_month_date.year

    # --- Segédfüggvény a számításokhoz ---
    def calculate_forecast_for_owners(owner_ids: list[int], is_family_forecast: bool = False):
        if not isinstance(owner_ids, list):
            owner_ids = [owner_ids]

        # --- JAVÍTOTT RENDSZERES BEVÉTELEK ---
        income_query = db.query(func.sum(models.RecurringRule.amount)).join(
            models.Account, models.RecurringRule.to_account_id == models.Account.id
        ).filter(
            models.RecurringRule.is_active == True,
            models.RecurringRule.type == 'bevétel',
            extract('year', models.RecurringRule.next_run_date) == next_month_year,
            extract('month', models.RecurringRule.next_run_date) == next_month
        )

        # Családi nézetben a szülők és a közös kasszák is számítanak
        if is_family_forecast:
            income_query = income_query.filter(
                or_(
                    models.Account.owner_user_id.in_(owner_ids),
                    models.Account.type == 'közös'
                )
            )
        else: # Személyes nézetben csak a saját kasszák
            income_query = income_query.filter(models.Account.owner_user_id.in_(owner_ids))
        
        recurring_income = income_query.scalar() or Decimal(0)

        # --- JAVÍTOTT RENDSZERES KIADÁSOK ---
        expense_query = db.query(func.sum(models.RecurringRule.amount)).join(
            models.Account, models.RecurringRule.to_account_id == models.Account.id
        ).filter(
            models.RecurringRule.is_active == True,
            models.RecurringRule.type == 'kiadás',
            extract('year', models.RecurringRule.next_run_date) == next_month_year,
            extract('month', models.RecurringRule.next_run_date) == next_month
        )

        if is_family_forecast:
            expense_query = expense_query.filter(
                or_(
                    models.Account.owner_user_id.in_(owner_ids),
                    models.Account.type == 'közös'
                )
            )
        else:
            expense_query = expense_query.filter(models.Account.owner_user_id.in_(owner_ids))

        recurring_expenses = expense_query.scalar() or Decimal(0)

        # --- TERVEZETT KIADÁSOK (a logika itt is a tulajdonoson alapul) ---
        expected_expenses = db.query(func.sum(models.ExpectedExpense.estimated_amount)).filter(
            models.ExpectedExpense.owner_id.in_(owner_ids),
            models.ExpectedExpense.status == 'tervezett',
            extract('year', models.ExpectedExpense.due_date) == next_month_year,
            extract('month', models.ExpectedExpense.due_date) == next_month
        ).scalar() or Decimal(0)

        total_income = recurring_income
        total_expenses = recurring_expenses + expected_expenses
        savings = total_income - total_expenses

        return {
            "projected_income": float(total_income),
            "projected_expenses": float(total_expenses),
            "projected_savings": float(savings)
        }

    # --- Fő logika ---
    if user.role in ["Családfő", "Szülő"]:
        # Szülői nézet: Két kalkuláció
        
        # 1. Személyes előrejelzés (csak a bejelentkezett felhasználó)
        personal_forecast = calculate_forecast_for_owners([user.id], is_family_forecast=False)

        # 2. Családi előrejelzés (az összes szülő, a gyerekek NÉLKÜL)
        parent_roles = ["Családfő", "Szülő"]
        parent_ids = [
            u.id for u in db.query(models.User.id)
            .filter(models.User.family_id == user.family_id, models.User.role.in_(parent_roles))
            .all()
        ]
        family_forecast = calculate_forecast_for_owners(parent_ids, is_family_forecast=True)

        return {
            "view_type": "parent",
            "personal": personal_forecast,
            "family": family_forecast,
            "month_name": next_month_date.strftime("%B")
        }
    else:
        # Gyerek nézet: Csak a sajátját számoljuk
        personal_forecast = calculate_forecast_for_owners([user.id], is_family_forecast=False)
        return {
            "view_type": "child",
            "personal": personal_forecast,
            "family": None, # Gyereknek nincs családi nézete
            "month_name": next_month_date.strftime("%B")
        }

def get_financial_summary(db: Session, user: models.User):
    """
    Kiszámolja a pénzügyi összegzést a Dashboard kártya számára a helyes, új logika alapján.
    """
    current_month = datetime.now().month
    current_year = datetime.now().year

    # A várható költségek lekérdezésének alapja
    expected_expenses_query = db.query(func.sum(models.ExpectedExpense.estimated_amount)).filter(
        models.ExpectedExpense.status == 'tervezett'
    )

    # Szerepkör-alapú szűrők definiálása
    if user.role in ["Családfő", "Szülő"]:
        # SZÜLŐI NÉZET
        parent_roles = ["Családfő", "Szülő"]
        parent_ids_query = db.query(models.User.id).filter(models.User.family_id == user.family_id, models.User.role.in_(parent_roles))
        parent_ids = [pid[0] for pid in parent_ids_query.all()]
        
        # A szülők egyenlege CSAK a személyes kasszáik összege
        total_balance = db.query(func.sum(models.Account.balance)).filter(
            models.Account.owner_user_id.in_(parent_ids),
            models.Account.type == 'személyes'
        ).scalar() or Decimal(0)

        # --- ÚJ RÉSZ KEZDETE ---
        # A bejelentkezett szülő saját személyes egyenlegének lekérdezése
        personal_balance = db.query(models.Account.balance).filter(
            models.Account.owner_user_id == user.id,
            models.Account.type == 'személyes'
        ).scalar() or Decimal(0)
        # --- ÚJ RÉSZ VÉGE ---

        # Havi bevétel: csak a külső forrásból származó
        monthly_income = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.account_id.in_(db.query(models.Account.id).filter(models.Account.owner_user_id.in_(parent_ids))),
            models.Transaction.type == 'bevétel',
            models.Transaction.transfer_id.is_(None), # Helyesebb IS NULL ellenőrzés
            extract('year', models.Transaction.date) == current_year,
            extract('month', models.Transaction.date) == current_month
        ).scalar() or Decimal(0)

        # Havi kiadás: külső kiadás VAGY zsebpénz
        monthly_expense = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.account_id.in_(db.query(models.Account.id).filter(models.Account.owner_user_id.in_(parent_ids))),
            models.Transaction.type == 'kiadás',
            or_(
                models.Transaction.transfer_id.is_(None),
                models.Transaction.is_family_expense == True
            ),
            extract('year', models.Transaction.date) == current_year,
            extract('month', models.Transaction.date) == current_month
        ).scalar() or Decimal(0)
        
        # A szülők az egész család várható költségeit látják
        expected_amount = expected_expenses_query.filter(models.ExpectedExpense.family_id == user.family_id).scalar() or Decimal(0)

        return {
            "view_type": "parent", 
            "balance_title": "Szülők közös egyenlege",
            "total_balance": float(total_balance), 
            "personal_balance": float(personal_balance),
            "monthly_income": float(monthly_income),
            "monthly_expense": float(monthly_expense), 
            "monthly_savings": float(monthly_income - monthly_expense),
            "expected_expenses": float(expected_amount),
            "available_balance": float(total_balance - expected_amount)
        }
    else:
        # GYEREK NÉZET
        personal_account = db.query(models.Account).filter(models.Account.owner_user_id == user.id).first()
        
        # A gyerek csak a saját várható költségeit látja
        expected_amount = expected_expenses_query.filter(models.ExpectedExpense.owner_id == user.id).scalar() or Decimal(0)

        if not personal_account:
            return {
                "view_type": "child", "balance_title": "Zsebpénzem", "total_balance": 0, 
                "monthly_income": 0, "monthly_expense": 0, "monthly_savings": 0,
                "expected_expenses": float(expected_amount), "available_balance": float(0 - expected_amount)
            }

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
            "view_type": "child", 
            "balance_title": "Zsebpénzem",
            "total_balance": float(total_balance), 
            "monthly_income": float(monthly_income),
            "monthly_expense": float(monthly_expense), 
            "monthly_savings": float(monthly_income - monthly_expense),
            "expected_expenses": float(expected_amount),
            "available_balance": float(total_balance - expected_amount)
        }


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
    Kategória költések lekérdezése - dashboard kártyához.
    Ez a végleges, javított verzió a tranzakciókat a főkategóriájuk alapján összegzi,
    és a főkategória színét használja a megjelenítéshez.
    """
    try:
        from datetime import datetime
        from sqlalchemy.orm import aliased
        from sqlalchemy import and_, or_, func, extract

        if not month:
            month = datetime.now().month
        if not year:
            year = datetime.now().year

        visible_account_ids = _get_analytics_account_ids(db, user)

        if not visible_account_ids:
            return []

        ParentCategory = aliased(models.Category, name="parent_category")
        
        # A véglegesen javított lekérdezés
        category_stats = db.query(
            func.coalesce(ParentCategory.name, models.Category.name).label("name"),
            func.coalesce(ParentCategory.color, models.Category.color).label("color"),
            func.sum(models.Transaction.amount).label("amount"),
            func.count(models.Transaction.id).label("transactionCount"),
        ).select_from(models.Transaction).join(
            models.Category, models.Transaction.category_id == models.Category.id
        ).outerjoin(
            ParentCategory, models.Category.parent_id == ParentCategory.id
        ).filter(
            models.Transaction.account_id.in_(visible_account_ids),
            models.Transaction.type == 'kiadás',
            extract('month', models.Transaction.date) == month,
            extract('year', models.Transaction.date) == year
        ).group_by(
            # --- Itt van a javítás ---
            func.coalesce(ParentCategory.name, models.Category.name),
            func.coalesce(ParentCategory.color, models.Category.color)
            # --- Javítás vége ---
        ).order_by(
            func.sum(models.Transaction.amount).desc()
        ).limit(10).all()

        return [
            {
                "name": stat.name,
                "color": stat.color or '#cccccc',
                "amount": float(stat.amount),
                "transactionCount": stat.transactionCount
            }
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
    
# === ÚJ CRUD MŰVELETEK A VÁRHATÓ KÖLTSÉGEKHEZ ===

def get_expected_expenses(db: Session, user: models.User):
    """
    Lekérdezi a várható költségeket jogosultságnak megfelelően.
    Szülők mindent látnak a családban, gyerekek csak a sajátjukat.
    """
    query = db.query(models.ExpectedExpense).options(
        joinedload(models.ExpectedExpense.owner),
        joinedload(models.ExpectedExpense.category)
    ).filter(models.ExpectedExpense.status == 'tervezett')

    if user.role in ["Családfő", "Szülő"]:
        return query.filter(models.ExpectedExpense.family_id == user.family_id).order_by(models.ExpectedExpense.due_date.asc()).all()
    else:
        return query.filter(models.ExpectedExpense.owner_id == user.id).order_by(models.ExpectedExpense.due_date.asc()).all()

def create_expected_expense(db: Session, expense_data: schemas.ExpectedExpenseCreate, user: models.User):
    """
    Új várható költség létrehozása.
    """
    due_date = expense_data.due_date
    today = date.today()

    if expense_data.due_date_option == 'this_month':
        due_date = date(today.year, today.month, 1) + relativedelta(months=1, days=-1)
    elif expense_data.due_date_option == 'next_month':
        due_date = date(today.year, today.month, 1) + relativedelta(months=2, days=-1)
    
    if not due_date:
        raise HTTPException(status_code=400, detail="Az esedékesség dátumának megadása kötelező.")

    # Biztonságosabb adatkinyerés a model_dump segítségével
    db_expense_data = expense_data.model_dump(exclude={"due_date", "due_date_option"})
    db_expense = models.ExpectedExpense(
        **db_expense_data,
        due_date=due_date,
        owner_id=user.id,
        family_id=user.family_id
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

def update_expected_expense(db: Session, expense_id: int, expense_data: schemas.ExpectedExpenseCreate, user: models.User):
    """
    Meglévő várható költség frissítése.
    """
    db_expense = db.query(models.ExpectedExpense).filter(models.ExpectedExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Várható költség nem található.")
    
    if db_expense.owner_id != user.id and user.role not in ["Családfő", "Szülő"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a módosításhoz.")
        
    update_data = expense_data.model_dump(exclude_unset=True)
    
    if "due_date_option" in update_data:
        today = date.today()
        if update_data["due_date_option"] == 'this_month':
            update_data["due_date"] = date(today.year, today.month, 1) + relativedelta(months=1, days=-1)
        elif update_data["due_date_option"] == 'next_month':
            update_data["due_date"] = date(today.year, today.month, 1) + relativedelta(months=2, days=-1)
        del update_data["due_date_option"]
    
    for key, value in update_data.items():
        setattr(db_expense, key, value)
        
    db.commit()
    db.refresh(db_expense)
    return db_expense

def delete_expected_expense(db: Session, expense_id: int, user: models.User):
    """
    Várható költség törlése (státusz 'törölve'-re állítása).
    """
    db_expense = db.query(models.ExpectedExpense).filter(models.ExpectedExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Várható költség nem található.")

    if db_expense.owner_id != user.id and user.role not in ["Családfő", "Szülő"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a törléshez.")
    
    db_expense.status = 'törölve'
    db.commit()
    db.refresh(db_expense)
    return db_expense

def complete_expected_expense(db: Session, expense_id: int, completion_data: schemas.ExpectedExpenseComplete, user: models.User):
    """
    Egy várható költség "teljesítése": létrehoz egy valódi tranzakciót.
    """
    db_expense = db.query(models.ExpectedExpense).filter(models.ExpectedExpense.id == expense_id).first()
    if not db_expense or db_expense.status != 'tervezett':
        raise HTTPException(status_code=404, detail="Tervezett állapotú várható költség nem található.")

    target_account = get_account(db, account_id=completion_data.account_id, user=user)
    if not target_account:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a választott kasszához.")

    transaction_schema = schemas.TransactionCreate(
        description=db_expense.description,
        amount=completion_data.actual_amount,
        type='kiadás',
        category_id=db_expense.category_id,
        creator_id=user.id
    )
    
    new_transaction = create_account_transaction(db, transaction=transaction_schema, account_id=target_account.id, user=user)

    db_expense.status = 'teljesült'
    db_expense.actual_amount = completion_data.actual_amount
    db_expense.transaction_id = new_transaction.id
    
    db.commit()
    db.refresh(db_expense)
    
    return db_expense
    
def get_upcoming_events(db: Session, user: models.User):
    today = date.today()
    thirty_days_later = today + timedelta(days=30)
    events = []

    user_ids = [user.id]
    if user.role in ["Családfő", "Szülő"]:
        user_ids = [m.id for m in user.family.members]

    recurring_rules = db.query(models.RecurringRule).options(joinedload(models.RecurringRule.owner_user)).filter(
        models.RecurringRule.owner_id.in_(user_ids),
        models.RecurringRule.is_active == True,
        models.RecurringRule.next_run_date.between(today, thirty_days_later)
    ).all()
    for rule in recurring_rules:
        events.append({
            "date": rule.next_run_date, "description": rule.description, "amount": rule.amount,
            "type": rule.type, "owner_name": rule.owner_user.display_name, "is_recurring": True
        })

    expected_expenses = db.query(models.ExpectedExpense).options(joinedload(models.ExpectedExpense.owner)).filter(
        models.ExpectedExpense.owner_id.in_(user_ids),
        models.ExpectedExpense.status == 'tervezett',
        models.ExpectedExpense.due_date.between(today, thirty_days_later)
    ).all()
    for expense in expected_expenses:
        events.append({
            "date": expense.due_date, "description": expense.description, "amount": expense.estimated_amount,
            "type": 'tervezett kiadás', "owner_name": expense.owner.display_name, "is_recurring": expense.is_recurring
        })

    return sorted(events, key=lambda e: e['date'])    

# --- Category CRUD ---
def get_category(db: Session, category_id: int):
    return db.query(models.Category).filter(models.Category.id == category_id).first()

def get_categories_tree(db: Session):
    """
    Ez a függvény adja vissza a kategóriákat fa-struktúrában.
    Csak a főkategóriákat kérdezi le, és az SQLAlchemy automatikusan betölti az alkategóriákat.
    """
    return db.query(models.Category).options(
        selectinload(models.Category.children)
    ).filter(models.Category.parent_id.is_(None)).all()

def create_category(db: Session, category: schemas.CategoryCreate):
    """
    Létrehoz egy új kategóriát. Ha alkategóriáról van szó, és nincs saját színe,
    akkor örökli a szülő kategória színét.
    """
    # Ellenőrzés duplikáció ellen
    exists_query = db.query(models.Category).filter(
        models.Category.name == category.name, 
        models.Category.parent_id == category.parent_id
    )
    if db.query(exists_query.exists()).scalar():
        raise HTTPException(status_code=400, detail="Ilyen nevű kategória már létezik ezen a szinten.")

    # === SZÍNÖRÖKLÉS LOGIKA KEZDETE ===
    # Ha alkategóriát hozunk létre (van parent_id) ÉS nem adtunk meg neki színt
    if category.parent_id and not category.color:
        parent_category = get_category(db, category.parent_id)
        if parent_category:
            # Az új kategória megkapja a szülő színét
            category.color = parent_category.color
    # === SZÍNÖRÖKLÉS LOGIKA VÉGE ===

    db_category = models.Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

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
    if not db_category:
        return None

    # Hivatkozások eltávolítása a törlés előtt
    db.query(models.Transaction).filter(models.Transaction.category_id == category_id).update({"category_id": None})
    db.query(models.ExpectedExpense).filter(models.ExpectedExpense.category_id == category_id).update({"category_id": None})
    db.query(models.RecurringRule).filter(models.RecurringRule.category_id == category_id).update({"category_id": None})
    
    # Alkategóriák felsőbb szintre emelése
    db.query(models.Category).filter(models.Category.parent_id == category_id).update({"parent_id": None})

    db.delete(db_category)
    db.commit()
    
    return db_category

# --- Wish CRUD Műveletek ---

def get_wish(db: Session, wish_id: int, user: models.User):
    """Lekérdez egy konkrét kívánságot, ellenőrizve a jogosultságot."""
    wish = db.query(models.Wish).filter(models.Wish.id == wish_id).first()
    if wish and wish.family_id != user.family_id:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod megtekinteni ezt a kívánságot.")
    return wish

def get_wishes_by_family(db: Session, user: models.User,
                         statuses: Optional[List[str]] = None,
                         owner_ids: Optional[List[int]] = None,
                         category_ids: Optional[List[int]] = None,
                         skip: int = 0, limit: int = 100):
    """Listázza egy család összes kívánságát, szűrési és jogosultsági feltételekkel."""

    # Alap lekérdezés a szükséges adatok betöltésével
    base_query = db.query(models.Wish).options(
        selectinload(models.Wish.owner),
        selectinload(models.Wish.approvals).selectinload(models.WishApproval.approver),
        selectinload(models.Wish.goal_account),
        selectinload(models.Wish.category),
        # --- JAVÍTÁS: Ezek a sorok biztosítják a képek és linkek betöltését ---
        selectinload(models.Wish.images),
        selectinload(models.Wish.links)
        # --- JAVÍTÁS VÉGE ---
    ).filter(models.Wish.family_id == user.family_id)

    # Jogosultsági szűrés: a gyerekek nem látják mások vázlatait
    if user.role not in ["Családfő", "Szülő"]:
        base_query = base_query.filter(
            or_(
                models.Wish.status != 'draft',
                models.Wish.owner_user_id == user.id
            )
        )

    # Dinamikus szűrők alkalmazása
    if statuses:
        base_query = base_query.filter(models.Wish.status.in_(statuses))
    if owner_ids:
        base_query = base_query.filter(models.Wish.owner_user_id.in_(owner_ids))
    if category_ids:
        base_query = base_query.filter(models.Wish.category_id.in_(category_ids))

    return base_query.order_by(models.Wish.created_at.desc()).offset(skip).limit(limit).all()

def create_wish(db: Session, wish: schemas.WishCreate, user: models.User):
    """
    Létrehoz egy új kívánságot a hozzá tartozó képekkel és linkekkel.
    Kezeli, hogy a kívánság vázlatként vagy azonnal beküldve jöjjön-e létre.
    """
    
    # 1. Különválasztjuk az alap adatokat a kapcsolódó entitásoktól és a vezérlő flag-től.
    wish_data = wish.model_dump(exclude={"images", "links", "submit_now"})
    db_wish = models.Wish(
        **wish_data,
        owner_user_id=user.id,
        family_id=user.family_id
    )
    
    # 2. Ha a frontend a "Jóváhagyásra küldés" gombbal küldte az adatot,
    # a státuszt rögtön 'pending'-re állítjuk. Különben 'draft' marad.
    if wish.submit_now:
        db_wish.status = 'pending'
        db_wish.submitted_at = datetime.utcnow()

    db.add(db_wish)
    
    # 3. A db.flush() parancs kiad egy előzetes mentést az adatbázis felé,
    # anélkül, hogy véglegesítené a tranzakciót. Erre azért van szükség,
    # hogy a 'db_wish' objektum megkapja az adatbázis által generált ID-ját,
    # amit a képek, linkek és előzmények mentéséhez használni tudunk.
    db.flush()

    # 4. Linkek feldolgozása és hozzáadása a kívánsághoz.
    if wish.links:
        for i, link_data in enumerate(wish.links):
            db_link = models.WishLink(**link_data.model_dump(), wish_id=db_wish.id, link_order=i)
            db.add(db_link)
            
    # 5. Képfeltöltés kezelése.
    # Éles környezetben itt egy felhő tárhelyre (pl. AWS S3, Firebase Storage) történne a feltöltés.
    # Most a fájl elérési útját mentjük el.
    if wish.images:
        upload_dir = "uploads/wish_images"
        os.makedirs(upload_dir, exist_ok=True)
        
        for i, img_base64 in enumerate(wish.images):
            try:
                header, encoded = img_base64.split(",", 1)
                image_data = base64.b64decode(encoded)
                
                file_extension = header.split("/")[1].split(";")[0]
                # Egyedi fájlnév generálása a félreértések elkerülése végett
                filename = f"{db_wish.id}_{user.id}_{datetime.utcnow().timestamp()}_{i}.{file_extension}"
                filepath = os.path.join(upload_dir, filename)
                
                # A fájl mentése a szerverre (a kikommentezett rész)
                # with open(filepath, "wb") as f:
                #     f.write(image_data)
                
                image_url = f"/{filepath}" # Relatív URL-ként mentjük
                
                db_image = models.WishImage(
                    wish_id=db_wish.id, 
                    image_url=image_url, 
                    image_order=i
                )
                db.add(db_image)
            except Exception as e:
                print(f"Hiba a képfeldolgozás során: {e}")
                continue

    # 6. Előzmény bejegyzések létrehozása a megfelelő eseményekről.
    create_history_entry(db, wish_id=db_wish.id, user_id=user.id, action='created', new_values={'name': db_wish.name})
    if wish.submit_now:
        create_history_entry(db, wish_id=db_wish.id, user_id=user.id, action='submitted')

    # 7. A tranzakció véglegesítése. Mostantól minden adat él az adatbázisban.
    db.commit()
    
    # 8. Az objektum frissítése az adatbázisból, hogy minden frissen generált adatot tartalmazzon.
    db.refresh(db_wish)
    
    return db_wish

def update_wish(db: Session, wish_id: int, wish_data: schemas.WishCreate, user: models.User):
    """Frissít egy meglévő kívánságot, és naplózza a változást."""
    db_wish = get_wish(db, wish_id, user)
    if not db_wish:
        raise HTTPException(status_code=404, detail="Kívánság nem található.")

    # Jogosultság: csak a tulajdonos módosíthatja, ha vázlat vagy visszaküldött
    can_edit = (
        user.id == db_wish.owner_user_id and
        db_wish.status in ['draft', 'modifications_requested']
    )
    if not can_edit:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a kívánság módosításához ebben az állapotban.")

    # Előzmény rögzítése a változásokról
    old_values = {"name": db_wish.name, "estimated_price": float(db_wish.estimated_price)}
    
    update_data = wish_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_wish, key, value)
    
    new_values = {"name": db_wish.name, "estimated_price": float(db_wish.estimated_price)}
    create_history_entry(db, wish_id=wish_id, user_id=user.id, action='modified', old_values=old_values, new_values=new_values)

    # Ha módosítás után visszakerül vázlatba, újra be kell küldeni
    if db_wish.status == 'modifications_requested':
        db_wish.status = 'draft'

    db.add(db_wish)
    db.commit()
    db.refresh(db_wish)
    return db_wish


def delete_wish(db: Session, wish_id: int, user: models.User):
    """Töröl egy kívánságot (soft delete)."""
    db_wish = get_wish(db, wish_id, user)
    if not db_wish:
        return None

    # Jogosultság ellenőrzés: csak a tulajdonos vagy családfő törölhet
    can_delete = (
        user.id == db_wish.owner_user_id or
        user.role == "Családfő"
    )
    if not can_delete:
         raise HTTPException(status_code=403, detail="Nincs jogosultságod a kívánság törléséhez.")

    db_wish.deleted_at = datetime.utcnow()
    db.commit()
    return {"detail": "Kívánság sikeresen törölve"}

def submit_wish_for_approval(db: Session, wish_id: int, user: models.User):
    """Beküldi a vázlat vagy módosításra visszaküldött kívánságot jóváhagyásra."""
    db_wish = get_wish(db, wish_id, user)
    if not db_wish:
        raise HTTPException(status_code=404, detail="Kívánság nem található.")
    if db_wish.owner_user_id != user.id:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod ezt a kívánságot beküldeni.")
    
    if db_wish.status not in ['draft', 'modifications_requested']:
        raise HTTPException(status_code=400, detail="Csak vázlat vagy módosításra visszaküldött kívánság küldhető be.")
    
    # --- JAVÍTÁS KEZDETE ---
    # Ha a kívánságot módosítás után küldik újra, töröljük a korábbi döntéseket,
    # hogy a szülők tiszta lappal szavazhassanak az új verzióról.
    if db_wish.status == 'modifications_requested':
        db.query(models.WishApproval).filter(models.WishApproval.wish_id == wish_id).delete()
    # --- JAVÍTÁS VÉGE ---

    db_wish.status = 'pending'
    
    create_history_entry(db, wish_id=wish_id, user_id=user.id, action="submitted")
    db.commit()
    db.refresh(db_wish)
    return db_wish

# backend/crud.py

def process_wish_approval(db: Session, wish_id: int, approval_data: schemas.WishApprovalCreate, approver: models.User):
    """Feldolgozza a szülői döntést egy kívánságról, de MÁR NEM hoz létre automatikusan kasszát."""
    if approver.role not in ["Családfő", "Szülő"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod döntést hozni.")

    db_wish = get_wish(db, wish_id, approver)
    if not db_wish:
        raise HTTPException(status_code=404, detail="Kívánság nem található.")
    if db_wish.status != 'pending':
        raise HTTPException(status_code=400, detail="Ez a kívánság jelenleg nem hagyható jóvá.")
    if db_wish.owner_user_id == approver.id:
        raise HTTPException(status_code=400, detail="Saját kívánságot nem hagyhatsz jóvá.")

    existing_approval = db.query(models.WishApproval).filter(
        models.WishApproval.wish_id == wish_id,
        models.WishApproval.approver_user_id == approver.id
    ).first()

    if existing_approval:
        if existing_approval.status == 'modifications_requested':
            db.delete(existing_approval)
            db.flush()
        else:
            raise HTTPException(status_code=400, detail="Erről a kívánságról már döntöttél.")

    # Új approval rekord létrehozása
    new_approval = models.WishApproval(
        wish_id=wish_id,
        approver_user_id=approver.id,
        status=approval_data.status,
        feedback=approval_data.feedback,
        conditional_note=approval_data.conditional_note
    )
    db.add(new_approval)

    # Döntés alapján a kívánság státuszának frissítése
    if approval_data.status == 'rejected':
        db_wish.status = 'rejected'
    elif approval_data.status == 'modifications_requested':
        db_wish.status = 'modifications_requested'
    elif approval_data.status in ['approved', 'conditional']:
        # Számoljuk ki, hány jóváhagyás kell
        wish_owner = db_wish.owner
        parents = db.query(models.User).filter(
            models.User.family_id == db_wish.family_id,
            models.User.role.in_(['Családfő', 'Szülő'])
        ).all()
        
        required_approvals = 0
        if wish_owner.role in ['Gyerek', 'Tizenéves']:
            required_approvals = len(parents)
        elif wish_owner.role in ['Szülő', 'Családfő']:
            required_approvals = 1
            
        # Számoljuk össze a jelenlegi támogató szavazatokat
        committed_approvals = db.query(models.WishApproval).filter(
            models.WishApproval.wish_id == wish_id,
            models.WishApproval.status.in_(['approved', 'conditional'])
        ).count()
        current_approvals_count = committed_approvals + 1
        
        is_fully_supported = False
        if approver.role == 'Családfő':
             is_fully_supported = True
        elif current_approvals_count >= required_approvals and required_approvals > 0:
             is_fully_supported = True

        # Ha megvan a kellő számú jóváhagyás
        if is_fully_supported:
            # Ha van 'conditional' szavazat, a végső státusz is az lesz.
            has_conditional = db.query(models.WishApproval).filter(
                models.WishApproval.wish_id == wish_id,
                models.WishApproval.status == 'conditional'
            ).count() > 0 or approval_data.status == 'conditional'

            if has_conditional:
                db_wish.status = 'conditional'
            else:
                db_wish.status = 'approved'
                db_wish.approved_at = datetime.utcnow()
            
            # FONTOS: A KASSZA LÉTREHOZÁSÁT TÖRÖLTÜK INNEN!

    # Előzmény bejegyzés létrehozása
    notes = f"Döntés: {approval_data.status}."
    if approval_data.feedback:
        notes += f" Visszajelzés: {approval_data.feedback}"
    create_history_entry(db, wish_id=wish_id, user_id=approver.id, action=approval_data.status, notes=notes)
    
    db.commit()
    db.refresh(db_wish)
    return db_wish

# A backend/crud.py fájlban, a többi CRUD függvény mellé

def get_dashboard_notifications(db: Session, user: models.User):
    """Összegyűjti a dashboardon megjelenítendő értesítéseket a felhasználó számára."""
    notifications = []

    # 1. Jóváhagyásra váró kívánságok (csak szülőknek)
    if user.role in ["Családfő", "Szülő"]:
        pending_wishes_count = db.query(models.Wish).filter(
            models.Wish.family_id == user.family_id,
            models.Wish.status == 'pending',
            # Olyan kívánság, amihez ennek a szülőnek még nincs jóváhagyása
            ~models.Wish.approvals.any(models.WishApproval.approver_user_id == user.id)
        ).count()

        if pending_wishes_count > 0:
            notifications.append({
                "type": "pending_approvals",
                "message": f"{pending_wishes_count} kívánság vár a jóváhagyásodra.",
                "link": "/wishes?tab=pending"
            })

    # 2. Módosításra visszaküldött kívánságok (csak a tulajdonosnak)
    mod_requested_count = db.query(models.Wish).filter(
        models.Wish.owner_user_id == user.id,
        models.Wish.status == 'modifications_requested'
    ).count()

    if mod_requested_count > 0:
        notifications.append({
            "type": "modifications_requested",
            "message": f"{mod_requested_count} kívánságod módosításra vár.",
            "link": "/wishes?tab=my-wishes"
        })

    # TODO: Később itt lehetne még több értesítés, pl. "Elérte a célját a kassza"

    return notifications

def create_history_entry(db: Session, wish_id: int, user_id: int, action: str, notes: str = None, old_values: dict = None, new_values: dict = None):
    """Létrehoz egy új bejegyzést a WishHistory táblában."""
    history_entry = models.WishHistory(
        wish_id=wish_id,
        user_id=user_id,
        action=action,
        notes=notes,
        old_values=old_values,
        new_values=new_values
    )
    db.add(history_entry)

def get_wish_history(db: Session, wish_id: int, user: models.User):
    """Lekérdezi egy kívánság teljes előzményét."""
    # Ellenőrizzük, hogy a felhasználónak van-e joga látni a kívánságot
    db_wish = get_wish(db, wish_id, user)
    if not db_wish:
        raise HTTPException(status_code=404, detail="Kívánság nem található.")
    
    return db.query(models.WishHistory).options(
        selectinload(models.WishHistory.user) # Betöltjük a felhasználó adatait is
    ).filter(models.WishHistory.wish_id == wish_id).order_by(models.WishHistory.created_at.desc()).all()

def create_and_submit_wish(db: Session, wish: schemas.WishCreate, user: models.User):
    """Létrehoz egy kívánságot és azonnal be is küldi jóváhagyásra."""
    # Létrehozzuk vázlatként
    db_wish = create_wish(db=db, wish=wish, user=user)
    
    # Azonnal be is küldjük
    return submit_wish_for_approval(db=db, wish_id=db_wish.id, user=user)

def activate_wish(db: Session, wish_id: int, user: models.User, goal_account_id: int = None):
    """
    Aktivál egy jóváhagyott vagy feltételes kívánságot.

    Ha a `goal_account_id` meg van adva, hozzárendeli a kívánságot a meglévő
    célkasszához és megnöveli annak célösszegét.

    Ha a `goal_account_id` nincs megadva, létrehoz egy új, dedikált célkasszát
    a kívánság alapján.
    """
    # 1. Jogosultság ellenőrzése
    if user.role not in ["Családfő", "Szülő"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a gyűjtés elindításához.")

    # 2. Kívánság lekérdezése és validálása
    db_wish = get_wish(db, wish_id, user)
    if not db_wish:
        raise HTTPException(status_code=404, detail="Kívánság nem található.")
    if db_wish.status not in ['approved', 'conditional']:
        raise HTTPException(status_code=400, detail="Csak jóváhagyott vagy feltételes kívánsághoz indítható gyűjtés.")
    if db_wish.goal_account_id:
        raise HTTPException(status_code=400, detail="Ehhez a kívánsághoz már tartozik egy célkassza.")

    target_account = None

    # 3. Logika elágaztatása: meglévő kassza VAGY új kassza
    
    # ESET A: Meglévő kasszához rendelés
    if goal_account_id:
        # A `get_account` egy feltételezett függvény, ami lekér egy kasszát ID alapján.
        # Ha nincs ilyen, létre kell hozni, vagy a meglévőt használni.
        # Itt most feltételezzük, hogy létezik `get_account(db, account_id)`.
        target_account = db.query(models.Account).filter(models.Account.id == goal_account_id).first()

        if not target_account or target_account.family_id != user.family_id or target_account.type != 'cél':
            raise HTTPException(status_code=404, detail="A megadott célkassza nem található vagy nincs jogosultságod hozzá.")
        
        # Dinamikusan növeljük a célkassza célösszegét a kívánság becsült árával
        if db_wish.estimated_price and target_account.goal_amount is not None:
            target_account.goal_amount += db_wish.estimated_price
        
        notes = f"Gyűjtés hozzárendelve a(z) '{target_account.name}' kasszához."

    # ESET B: Új, dedikált kassza létrehozása
    else:
        goal_account_schema = schemas.AccountCreate(
            name=f"Cél: {db_wish.name}",
            type='cél',
            goal_amount=db_wish.estimated_price,
            goal_date=db_wish.deadline,
            show_on_dashboard=True,
            viewer_ids=[member.id for member in db_wish.family.members]
        )
        # A `create_family_account` függvényt használjuk, amit korábban is
        target_account = create_family_account(db, account=goal_account_schema, family_id=db_wish.family_id, owner_user=db_wish.owner)
        notes = f"Gyűjtés elindítva egy új, dedikált kasszában: '{target_account.name}'."


    # 4. Kívánság állapotának frissítése mindkét esetben
    db_wish.goal_account_id = target_account.id
    # A 'conditional' státuszt is átállítjuk 'approved'-ra, mivel a gyűjtés elindult.
    db_wish.status = 'approved'
    db_wish.approved_at = datetime.utcnow()

    # 5. Előzmény bejegyzés létrehozása
    create_history_entry(db, wish_id=wish_id, user_id=user.id, action='activated', notes=notes)
    
    # 6. Változások mentése az adatbázisba
    db.commit()
    db.refresh(db_wish)
    
    return db_wish

def close_goal_account(db: Session, account_id: int, user: models.User):
    """
    Lezár egy célkasszát, ha az elérte a célösszeget.
    Minden kapcsolódó, még aktív kívánság státuszát 'completed'-re állítja.
    """
    # 1. Jogosultság és validáció
    if user.role not in ["Családfő", "Szülő"]:
        raise HTTPException(status_code=403, detail="Nincs jogosultságod a kassza lezárásához.")

    db_account = get_account(db, account_id, user) # A get_account már tartalmazza a jogosultság-ellenőrzést
    if not db_account:
        raise HTTPException(status_code=404, detail="Célkassza nem található.")
    if db_account.type != 'cél':
        raise HTTPException(status_code=400, detail="Csak célkassza zárható le.")
    if db_account.balance < db_account.goal_amount:
        raise HTTPException(status_code=400, detail="A kassza még nem érte el a célösszeget a lezáráshoz.")

    # 2. Kapcsolódó kívánságok státuszának frissítése
    # A db_account.wishes már be van töltve a get_account hívásnak köszönhetően
    updated_wishes_count = 0
    for wish in db_account.wishes:
        if wish.status != 'completed':
            wish.status = 'completed'
            wish.completed_at = datetime.utcnow()
            create_history_entry(
                db, 
                wish_id=wish.id, 
                user_id=user.id, 
                action='completed', 
                notes=f"Automatikus teljesítés a(z) '{db_account.name}' kassza lezárásával."
            )
            updated_wishes_count += 1
    
    # 3. Kassza "lezárása"
    # A kasszát nem töröljük, csak átnevezzük és levesszük a dashboardról,
    # hogy a múltbeli adatok megmaradjanak.
    if not db_account.name.startswith("[Teljesítve]"):
        db_account.name = f"[Teljesítve] {db_account.name}"
    db_account.show_on_dashboard = False
    
    db.commit()
    db.refresh(db_account)
    
    return {
        "account": db_account,
        "message": f"Kassza sikeresen lezárva. {updated_wishes_count} kívánság státusza 'teljesítve'-re állítva."
    }    