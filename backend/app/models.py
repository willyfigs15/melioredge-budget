from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text,
    UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """Mirror of the dashboard user. Populated lazily from handoff tokens.

    We never store passwords here — auth lives in the dashboard.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)          # same id as dashboard
    email = Column(String, index=True, default="")
    name = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)

    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    recurring = relationship("RecurringTransaction", back_populates="user", cascade="all, delete-orphan")


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_budget_user_year_month"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)          # 1–12
    name = Column(String, default="")
    projected_income = Column(Numeric(12, 2), nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="budgets")
    categories = relationship("Category", back_populates="budget", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    budget_id = Column(Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    limit_amount = Column(Numeric(12, 2), nullable=False, default=0)
    color = Column(String, default="#22c55e")
    icon = Column(String, default="Wallet")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    budget = relationship("Budget", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_txn_user_date", "user_id", "date"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    import_id = Column(Integer, ForeignKey("imports.id", ondelete="SET NULL"), nullable=True, index=True)

    date = Column(Date, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)   # always positive; sign carried by `type`
    description = Column(String, default="")
    type = Column(String, nullable=False)             # "income" | "expense"
    source = Column(String, default="manual")         # "manual" | "import"
    external_id = Column(String, default="")          # from bank CSV, for dedup

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    import_ = relationship("Import", back_populates="transactions")


class Import(Base):
    __tablename__ = "imports"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    rows_total = Column(Integer, default=0)
    rows_imported = Column(Integer, default=0)
    rows_skipped = Column(Integer, default=0)
    status = Column(String, default="pending")       # pending | completed | failed
    error = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="import_")


class RecurringTransaction(Base):
    """Template for transactions that repeat every month.

    Applied via POST /api/recurring/apply/{year}/{month} — creates real
    Transaction rows for the target month (skipping dupes).
    """
    __tablename__ = "recurring_transactions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    day_of_month = Column(Integer, nullable=False)      # 1–31
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, default="")
    type = Column(String, nullable=False)               # income | expense
    active = Column(Boolean, default=True, nullable=False)
    note = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="recurring")
