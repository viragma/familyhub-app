from sqlalchemy import (
    Boolean, Column, Integer, String, Date, ForeignKey,
    Numeric, DateTime, Table, Enum,Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from sqlalchemy.dialects.postgresql import UUID, JSONB


# Összekötő tábla a kasszák láthatóságához
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
    
    children = relationship("Category", back_populates="parent")
    parent = relationship("Category", remote_side=[id], back_populates="children")
    
    transactions = relationship("Transaction", back_populates="category")
    expected_expenses = relationship("ExpectedExpense", back_populates="category")
    wishes = relationship("Wish", back_populates="category")

class Family(Base):
    __tablename__ = "families"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    members = relationship("User", back_populates="family")
    accounts = relationship("Account", back_populates="family")
    expected_expenses = relationship("ExpectedExpense", back_populates="family")
    wishes = relationship("Wish", back_populates="family")

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
    wishlist_items = relationship("WishlistItem", back_populates="owner")
    transactions = relationship("Transaction", back_populates="creator")
    expected_expenses = relationship("ExpectedExpense", back_populates="owner")
    recurring_rules = relationship("RecurringRule", back_populates="owner_user")
    
    # JAVÍTOTT KAPCSOLAT: User -> Account (many-to-many)
    visible_accounts = relationship("Account", secondary=account_visibility_association, back_populates="viewers")
    owned_accounts = relationship("Account", back_populates="owner_user", foreign_keys="[Account.owner_user_id]")
    wishes = relationship("Wish", back_populates="owner", foreign_keys="[Wish.owner_user_id]")



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
    goal_date = Column(Date, nullable=True)
    show_on_dashboard = Column(Boolean, default=False)
    
    family_id = Column(Integer, ForeignKey("families.id"))
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    family = relationship("Family", back_populates="accounts")
    owner_user = relationship("User", back_populates="owned_accounts", foreign_keys=[owner_user_id])
    transactions = relationship("Transaction", back_populates="account")
    
 # JAVÍTOTT KAPCSOLAT: Account -> User (many-to-many)
    viewers = relationship("User", secondary=account_visibility_association, back_populates="visible_accounts")
    # === EZ AZ ÚJ SOR ===
    wishes = relationship("Wish", back_populates="goal_account", foreign_keys="[Wish.goal_account_id]")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Numeric(10, 2))
    type = Column(String)
    date = Column(DateTime(timezone=True), server_default=func.now())
    account_id = Column(Integer, ForeignKey("accounts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    transfer_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    is_family_expense = Column(Boolean, default=False)
    
    account = relationship("Account", back_populates="transactions")
    creator = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    expected_expense = relationship("ExpectedExpense", back_populates="transaction", uselist=False)

class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    price = Column(Numeric(10, 2))
    url = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="wishlist_items")

class RecurringRule(Base):
    __tablename__ = "recurring_rules"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Numeric(10, 2))
    type = Column(String)
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    frequency = Column(String)
    day_of_month = Column(Integer, nullable=True)
    day_of_week = Column(Integer, nullable=True)
    month_of_year = Column(Integer, nullable=True)
    start_date = Column(Date, default=func.now())
    end_date = Column(Date, nullable=True)
    next_run_date = Column(Date)
    is_active = Column(Boolean, default=True)

    owner_user = relationship("User", back_populates="recurring_rules")

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


class Wish(Base):
    __tablename__ = "wishes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    estimated_price = Column(Numeric(10, 2), nullable=False)
    actual_price = Column(Numeric(10, 2), nullable=True)
    priority = Column(Enum('low', 'medium', 'high', name='wish_priority_enum'), default='medium')
    status = Column(Enum('draft', 'pending', 'approved', 'conditional', 'modifications_requested', 'rejected', 'completed', name='wish_status_enum'), default='draft')
    deadline = Column(Date, nullable=True)
    
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    goal_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    owner = relationship("User", back_populates="wishes", foreign_keys=[owner_user_id])
    family = relationship("Family", back_populates="wishes")
    category = relationship("Category", back_populates="wishes")
    # === EZ A MÓDOSÍTÁS ===
    goal_account = relationship("Account", back_populates="wishes", foreign_keys=[goal_account_id])
    
    images = relationship("WishImage", back_populates="wish", cascade="all, delete-orphan")
    links = relationship("WishLink", back_populates="wish", cascade="all, delete-orphan")
    approvals = relationship("WishApproval", back_populates="wish", cascade="all, delete-orphan")
    history = relationship("WishHistory", back_populates="wish", cascade="all, delete-orphan")

class WishImage(Base):
    __tablename__ = "wish_images"
    id = Column(Integer, primary_key=True, index=True)
    wish_id = Column(Integer, ForeignKey("wishes.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    image_order = Column(Integer, default=0)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    wish = relationship("Wish", back_populates="images")

class WishLink(Base):
    __tablename__ = "wish_links"
    id = Column(Integer, primary_key=True, index=True)
    wish_id = Column(Integer, ForeignKey("wishes.id"), nullable=False)
    url = Column(String(500), nullable=False)
    title = Column(String(255), nullable=True)
    link_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    wish = relationship("Wish", back_populates="links")

class WishApproval(Base):
    __tablename__ = "wish_approvals"
    id = Column(Integer, primary_key=True, index=True)
    wish_id = Column(Integer, ForeignKey("wishes.id"), nullable=False)
    approver_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum('approved', 'rejected', 'modifications_requested', 'conditional', name='approval_status_enum'), nullable=False)
    feedback = Column(Text, nullable=True)
    conditional_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    wish = relationship("Wish", back_populates="approvals")
    approver = relationship("User")

class WishHistory(Base):
    __tablename__ = "wish_history"
    id = Column(Integer, primary_key=True, index=True)
    wish_id = Column(Integer, ForeignKey("wishes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(Enum('created', 'submitted', 'approved', 'rejected', 'modified', 'completed', 'deleted', 'conditional', 'modifications_requested', 'activated', name='history_action_enum'), nullable=False)
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wish = relationship("Wish", back_populates="history")
    user = relationship("User")