from sqlalchemy import Boolean, Column, Integer, String, Date, ForeignKey, Numeric, DateTime, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from sqlalchemy import (
    Boolean, Column, Integer, String, Date, ForeignKey,
    Numeric, DateTime, Table, Enum
)
from sqlalchemy.dialects.postgresql import UUID
import uuid

# === ÚJ ÖSSZEKÖTŐ TÁBLA ===
# Ez a tábla nem lesz egy külön 'modell' osztály, csak egy leírás
# arról, hogyan kapcsolódnak össze a felhasználók és a kasszák.
account_visibility_association = Table('account_visibility', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('account_id', Integer, ForeignKey('accounts.id'), primary_key=True)
)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    color = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    transactions = relationship("Transaction", back_populates="category")
    # VISSZAHIVATKOZÁS HOZZÁADVA
    expected_expenses = relationship("ExpectedExpense", back_populates="category")

class Family(Base):
    __tablename__ = "families"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    members = relationship("User", back_populates="family")
    accounts = relationship("Account", back_populates="family")
    # VISSZAHIVATKOZÁS HOZZÁADVA
    expected_expenses = relationship("ExpectedExpense", back_populates="family")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    display_name = Column(String)
    birth_date = Column(Date, nullable=True)
    role = Column(String)
    pin_hash = Column(String)
    avatar_url = Column(String, nullable=True)
    family_id = Column(Integer, ForeignKey("families.id"))
    family = relationship("Family", back_populates="members")
    tasks = relationship("Task", back_populates="owner")
    personal_account = relationship("Account", uselist=False, back_populates="owner_user")
    wishlist_items = relationship("WishlistItem", back_populates="owner")
    transactions = relationship("Transaction", back_populates="creator")
    visible_accounts = relationship("Account", secondary=account_visibility_association, back_populates="viewers")
    # VISSZAHIVATKOZÁS HOZZÁADVA
    expected_expenses = relationship("ExpectedExpense", back_populates="owner")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    status = Column(String, default='nyitott')
    reward_type = Column(String, nullable=True)
    reward_value = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="tasks")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)
    balance = Column(Numeric(10, 2), default=0.00)
    goal_amount = Column(Numeric(10, 2), nullable=True)
    goal_date = Column(Date, nullable=True) # <-- ÚJ OSZLOP
    
    # Az 'is_family_wide' oszlopot lecseréljük erre:
    show_on_dashboard = Column(Boolean, default=False)
    
    family_id = Column(Integer, ForeignKey("families.id"))
    family = relationship("Family", back_populates="accounts")
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner_user = relationship("User", back_populates="personal_account")
    transactions = relationship("Transaction", back_populates="account")
    
    # ÚJ KAPCSOLAT: Mely felhasználók láthatják ezt a kasszát
    viewers = relationship("User", secondary=account_visibility_association, back_populates="visible_accounts")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Numeric(10, 2))
    type = Column(String)
    date = Column(DateTime(timezone=True), server_default=func.now())
    account_id = Column(Integer, ForeignKey("accounts.id"))
    account = relationship("Account", back_populates="transactions")
    user_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User", back_populates="transactions")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="transactions")
    transfer_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    is_family_expense = Column(Boolean, default=False)
    # VISSZAHIVATKOZÁS HOZZÁADVA
    expected_expense = relationship("ExpectedExpense", back_populates="transaction", uselist=False)


class Debt(Base):
    __tablename__ = "debts"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Numeric(10, 2))
    is_settled = Column(Boolean, default=False)
    lender_id = Column(Integer, ForeignKey("users.id"))
    borrower_id = Column(Integer, ForeignKey("users.id"))

class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    price = Column(Numeric(10, 2))
    url = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="wishlist_items")

    # ... (a többi modell osztály változatlan)

class RecurringRule(Base):
    __tablename__ = "recurring_rules"
    id = Column(Integer, primary_key=True, index=True)
    
    # A tranzakció adatai
    description = Column(String)
    amount = Column(Numeric(10, 2))
    type = Column(String) # 'bevétel', 'kiadás', 'átutalás'
    
    # Kapcsolatok
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Ismétlődési szabályok
    frequency = Column(String) # pl. 'havi', 'heti'
    day_of_month = Column(Integer, nullable=True) # 1-31, vagy speciális érték (pl. 99 az utolsó napra)
    day_of_week = Column(Integer, nullable=True) # 1 a hétfő, 7 a vasárnap
    month_of_year = Column(Integer, nullable=True) # 1-12
    # Érvényesség és állapot
    start_date = Column(Date, default=func.now())
    end_date = Column(Date, nullable=True)
    next_run_date = Column(Date)
    is_active = Column(Boolean, default=True) # A szüneteltetéshez

class ExpectedExpense(Base):
    __tablename__ = 'expected_expenses'
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    estimated_amount = Column(Numeric(10, 2), nullable=False)
    actual_amount = Column(Numeric(10, 2), nullable=True)
    due_date = Column(Date, nullable=False)
    status = Column(Enum('tervezett', 'teljesült', 'törölve', name='expense_status_enum'), default='tervezett', nullable=False)
    priority = Column(Enum('magas', 'közepes', 'alacsony', name='priority_enum'), default='közepes', nullable=False)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    family_id = Column(Integer, ForeignKey('families.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    transaction_id = Column(Integer, ForeignKey('transactions.id'), nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurring_frequency = Column(String, nullable=True)
    
    owner = relationship("User", back_populates="expected_expenses")
    family = relationship("Family", back_populates="expected_expenses")
    category = relationship("Category", back_populates="expected_expenses")
    transaction = relationship("Transaction", back_populates="expected_expense", uselist=False)