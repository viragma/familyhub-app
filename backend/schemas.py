from pydantic import BaseModel
from datetime import date
from datetime import datetime
from decimal import Decimal 
from typing import List, Optional
from typing import Optional
import uuid


class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    children: List['Category'] = []

    class Config:
        from_attributes = True

# --- Task Sémák (Frissítve) ---
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

# --- User és Family Sémák (Változatlanok) ---
class UserBase(BaseModel):
    name: str
    display_name: str
    birth_date: date | None = None
    avatar_url: str | None = None
    role: str

class UserCreate(UserBase):
    pin: str
    family_id: int

class User(UserBase):
    id: int
    family_id: int
    class Config:
        from_attributes = True

# A User osztály alá, de még a Family elé
class UserProfile(BaseModel):
    id: int
    display_name: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True

class FamilyBase(BaseModel):
    name: str

class FamilyCreate(FamilyBase):
    pass

class Family(FamilyBase):
    id: int
    members: list[User] = []
    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    description: str
    amount: Decimal
    type: str # 'bevétel' vagy 'kiadás'
    category_id: Optional[int] = None # Frissítve: a category_id-t fogadjuk
    creator: Optional[UserProfile] = None # Frissítve: a creator-t fogadjuk



class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    date: datetime
    account_id: int
    category: Optional[Category] = None # A teljes kategória objektumot is vissza tudjuk adni
    creator: Optional[UserProfile] = None
    transfer_id: Optional[uuid.UUID] = None
    class Config:
        from_attributes = True

class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal
    description: str

class AccountBase(BaseModel):
    name: str
    type: str
    goal_amount: Optional[Decimal] = None
    goal_date: Optional[date] = None
    # Az 'is_family_wide' mezőt ELTÁVOLÍTJUK

class AccountCreate(AccountBase):
    viewer_ids: list[int] = []
    show_on_dashboard: bool = False # Hozzáadjuk az új mezőt

class Account(AccountBase):
    id: int
    balance: Decimal
    family_id: int
    owner_user_id: int | None = None
    transactions: list[Transaction] = []
    # A válaszban is visszaküldhetjük, kik láthatják
    viewers: list[UserProfile] = []
    owner_user: Optional[UserProfile] = None
    class Config:
        from_attributes = True