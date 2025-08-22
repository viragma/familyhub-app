from sqlalchemy import Boolean, Column, Integer, String, Date, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.sql import func
from .database import Base

class Family(Base):
    __tablename__ = "families"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    members = relationship("User", back_populates="family")
    accounts = relationship("Account", back_populates="family")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    
    # A hierarchia kulcsa: egy kategóriának lehet szülője ugyanabból a táblából
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    
    transactions = relationship("Transaction", back_populates="category")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    display_name = Column(String)
    birth_date = Column(Date, nullable=True)
    role = Column(String)
    pin_hash = Column(String)
    avatar_url = Column(String, nullable=True)
    
    transactions = relationship("Transaction", back_populates="creator")

    family_id = Column(Integer, ForeignKey("families.id"))
    family = relationship("Family", back_populates="members")
    
    tasks = relationship("Task", back_populates="owner")
    personal_account = relationship("Account", uselist=False, back_populates="owner_user")
    wishlist_items = relationship("WishlistItem", back_populates="owner")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    status = Column(String, default='nyitott')
    reward_type = Column(String, nullable=True)
    reward_value = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="tasks")

# === ÚJ MODELLEK A PÉNZÜGYI MODULHOZ ===

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String) # 'közös', 'személyes', 'cél', 'vész'
    balance = Column(Numeric(10, 2), default=0.00)
    
    family_id = Column(Integer, ForeignKey("families.id"))
    family = relationship("Family", back_populates="accounts")

    # A 'személyes' kassza egy konkrét userhez tartozik
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner_user = relationship("User", back_populates="personal_account")
    
    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Numeric(10, 2))
    type = Column(String) # 'bevétel' vagy 'kiadás'
    date = Column(DateTime(timezone=True), server_default=func.now())
    account_id = Column(Integer, ForeignKey("accounts.id"))
    account = relationship("Account", back_populates="transactions")
    user_id = Column(Integer, ForeignKey("users.id")) # Ki rögzítette
    creator = relationship("User", back_populates="transactions")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="transactions")
      # === ÚJ OSZLOP ===
    # Ez az azonosító fogja összekötni az átutalás két tranzakcióját.
    transfer_id = Column(UUID(as_uuid=True), nullable=True, index=True)

class Debt(Base):
    __tablename__ = "debts"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    amount = Column(Numeric(10, 2))
    is_settled = Column(Boolean, default=False)

    lender_id = Column(Integer, ForeignKey("users.id")) # Hitelező
    borrower_id = Column(Integer, ForeignKey("users.id")) # Adós

class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    price = Column(Numeric(10, 2))
    url = Column(String, nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="wishlist_items")