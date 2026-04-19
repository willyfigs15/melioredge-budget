from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, ConfigDict


# ─── Auth ──────────────────────────────────────────────────────────

class HandoffVerifyRequest(BaseModel):
    token: str


class HandoffVerifyResponse(BaseModel):
    valid: bool
    user_id: Optional[int] = None
    name: str = ""
    email: str = ""


class MeResponse(BaseModel):
    id: int
    email: str
    name: str


# ─── Category ──────────────────────────────────────────────────────

class CategoryIn(BaseModel):
    name: str
    limit_amount: Decimal = Field(default=Decimal("0"), ge=0)
    color: str = "#22c55e"
    icon: str = "Wallet"
    sort_order: int = 0


class CategoryOut(CategoryIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    budget_id: int


# ─── Budget ────────────────────────────────────────────────────────

class BudgetIn(BaseModel):
    year: int = Field(ge=1970, le=2100)
    month: int = Field(ge=1, le=12)
    name: str = ""


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    year: int
    month: int
    name: str
    categories: list[CategoryOut] = []
    created_at: datetime


# ─── Transaction ───────────────────────────────────────────────────

TxnType = Literal["income", "expense"]


class TransactionIn(BaseModel):
    date: date
    amount: Decimal = Field(gt=0)
    description: str = ""
    type: TxnType
    category_id: Optional[int] = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: date
    amount: Decimal
    description: str
    type: TxnType
    source: str
    category_id: Optional[int]
    import_id: Optional[int]
    created_at: datetime


class TransactionListOut(BaseModel):
    items: list[TransactionOut]
    total: int


# ─── Import ────────────────────────────────────────────────────────

class ImportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    rows_total: int
    rows_imported: int
    rows_skipped: int
    status: str
    error: str
    created_at: datetime


class ImportPreviewRow(BaseModel):
    date: Optional[date] = None
    amount: Optional[Decimal] = None
    description: str = ""
    type: Optional[TxnType] = None
    raw: dict = {}


class ImportPreviewResponse(BaseModel):
    filename: str
    columns: list[str]
    suggested_mapping: dict[str, Optional[str]]   # our fields → csv column
    sample_rows: list[ImportPreviewRow]
    total_rows: int


class ImportConfirmRequest(BaseModel):
    filename: str
    mapping: dict[str, str]                        # our fields → csv column
    content_b64: str                               # re-uploaded file payload
    default_category_id: Optional[int] = None


# ─── Dashboard ─────────────────────────────────────────────────────

class CategorySummary(BaseModel):
    category_id: Optional[int]
    name: str
    color: str
    limit_amount: Decimal
    spent: Decimal
    remaining: Decimal
    percent_used: float


class DashboardSummary(BaseModel):
    year: int
    month: int
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    budget_total: Decimal
    budget_used: Decimal
    categories: list[CategorySummary]
    health_score: int                              # 0–100 (v1: simple savings-rate heuristic)
    ready_to_invest: bool
