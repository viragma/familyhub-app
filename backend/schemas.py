from pydantic import BaseModel
from datetime import date
from datetime import datetime
from decimal import Decimal 
from typing import List, Optional, ForwardRef,Literal
import uuid

# --- Várható Költség Sémák ---
class ExpectedExpenseBase(BaseModel):
    description: str
    estimated_amount: Decimal
    priority: Literal['magas', 'közepes', 'alacsony'] = 'közepes'
    category_id: Optional[int] = None
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None

class ExpectedExpenseCreate(ExpectedExpenseBase):
    # A frontendtől vagy egy konkrét dátum, vagy egy opció érkezik
    due_date: Optional[date] = None
    # JAVÍTÁS: A hiányzó mező hozzáadva
    due_date_option: Optional[Literal['specific_date', 'this_month', 'next_month']] = 'specific_date'

class ExpectedExpense(ExpectedExpenseBase):
    id: int
    due_date: date # A DB-ből már mindig konkrét dátum jön vissza
    actual_amount: Optional[Decimal] = None
    status: Literal['tervezett', 'teljesült', 'törölve']
    owner_id: int
    family_id: int
    transaction_id: Optional[int] = None
    
    owner: 'UserProfile'
    category: Optional['CategorySimple'] = None

    class Config:
        from_attributes = True

class ExpectedExpenseComplete(BaseModel):
    actual_amount: Decimal
    account_id: int

class UpcomingEvent(BaseModel):
    date: date
    description: str
    amount: Decimal
    type: str  # 'bevétel', 'kiadás', 'átutalás', 'tervezett kiadás'
    owner_name: str
    is_recurring: bool

    class Config:
        from_attributes = True
# --- Base modellek ---
class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

# Simple Category without children for avoiding recursion
class CategorySimple(CategoryBase):
    id: int
    
    class Config:
        from_attributes = True

# Full Category with children - használd csak akkor, amikor tényleg kell
class Category(CategoryBase):
    id: int
    children: List['Category'] = []

    class Config:
        from_attributes = True
        # Recursion limit beállítás
        validate_assignment = True

# Response model kategóriákhoz - ez használható a legtöbb API válaszban
class CategoryResponse(CategoryBase):
    id: int
    has_children: bool = False  # Jelzi, hogy vannak-e gyerekei
    
    class Config:
        from_attributes = True

# --- Task Sémák ---
class TaskBase(BaseModel):
    title: str
    status: str = 'nyitott'
    reward_type: str | None = None
    reward_value: str | None = None
    owner_id: int | None = None

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    
    class Config:
        from_attributes = True

# --- User sémák ---
class UserBase(BaseModel):
    name: str
    display_name: str
    birth_date: date | None = None
    avatar_url: str | None = None
    role: str

class UserCreate(UserBase):
    pin: str
    family_id: int

# Simple user profile - cirkuláris referenciák elkerüléséhez
class UserProfile(BaseModel):
    id: int
    display_name: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True

# User without family reference
class User(UserBase):
    id: int
    family_id: int
    expected_expenses: List[ExpectedExpense] = []
    
    class Config:
        from_attributes = True

# --- Family sémák ---
class FamilyBase(BaseModel):
    name: str

class FamilyCreate(FamilyBase):
    pass

# Family without members to avoid recursion
class FamilySimple(FamilyBase):
    id: int
    
    class Config:
        from_attributes = True

# Full family with members - csak ha tényleg kell
class Family(FamilyBase):
    id: int
    members: list[UserProfile] = []
    # FRISSÍTÉS: Hozzáadjuk a várható költségeket
    expected_expenses: List[ExpectedExpense] = []
    
    class Config:
        from_attributes = True

# --- Transaction sémák ---
class TransactionBase(BaseModel):
    description: str
    amount: Decimal
    type: str # 'bevétel' vagy 'kiadás'
    category_id: Optional[int] = None
    creator_id: Optional[int] = None  # Csak ID-t tárolunk

class TransactionCreate(TransactionBase):
    pass

# Simple transaction response
class TransactionSimple(TransactionBase):
    id: int
    date: datetime
    account_id: int
    transfer_id: Optional[uuid.UUID] = None
    
    class Config:
        from_attributes = True

# Full transaction with related objects
class Transaction(TransactionBase):
    id: int
    date: datetime
    account_id: int
    category: Optional[CategoryResponse] = None  # CategoryResponse használata
    creator: Optional[UserProfile] = None
    transfer_id: Optional[uuid.UUID] = None
    
    class Config:
        from_attributes = True

# --- Transfer séma ---
class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal
    description: str

# --- Account sémák ---
class AccountBase(BaseModel):
    name: str
    type: str
    goal_amount: Optional[Decimal] = None
    goal_date: Optional[date] = None

class AccountCreate(AccountBase):
    viewer_ids: list[int] = []
    show_on_dashboard: bool = False

# Simple account response
class AccountSimple(AccountBase):
    id: int
    balance: Decimal
    family_id: int
    owner_user_id: int | None = None
    
    class Config:
        from_attributes = True

# Full account with related objects - használd csak akkor, amikor kell
class Account(AccountBase):
    id: int
    balance: Decimal
    family_id: int
    owner_user_id: int | None = None
    # transactions: list[TransactionSimple] = []  # TransactionSimple használata
    viewers: list[UserProfile] = []
    owner_user: Optional[UserProfile] = None
    
    class Config:
        from_attributes = True

# Account response transactions nélkül - a legtöbb esetben ezt használd
class AccountResponse(AccountBase):
    id: int
    balance: Decimal
    family_id: int
    owner_user_id: int | None = None
    viewers: list[UserProfile] = []
    owner_user: Optional[UserProfile] = None
    show_on_dashboard: bool = False
    
    class Config:
        from_attributes = True

# --- Recurring Rule sémák ---
class RecurringRuleBase(BaseModel):
    description: str
    amount: Decimal
    type: str # 'bevétel', 'kiadás', vagy 'átutalás'
    from_account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    category_id: Optional[int] = None
    frequency: str
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    month_of_year: Optional[int] = None
    start_date: date
    end_date: Optional[date] = None

class RecurringRuleCreate(RecurringRuleBase):
    pass

class RecurringRule(RecurringRuleBase):
    id: int
    owner_id: int
    next_run_date: date
    is_active: bool

    class Config:
        from_attributes = True

# Forward reference frissítések
Category.model_rebuild()
ExpectedExpense.model_rebuild()