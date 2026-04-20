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
    projected_income: Decimal = Field(default=Decimal("0"), ge=0)


class BudgetPatch(BaseModel):
    name: Optional[str] = None
    year: Optional[int] = Field(default=None, ge=1970, le=2100)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    projected_income: Optional[Decimal] = Field(default=None, ge=0)


class BudgetDuplicateRequest(BaseModel):
    source_budget_id: int
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
    projected_income: Decimal = Decimal("0")
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


# ─── Template-mode import ──────────────────────────────────────────

class ImportRowError(BaseModel):
    row: int
    field: str
    message: str


class ImportTemplatePreviewRow(BaseModel):
    date: date
    amount: Decimal
    description: str
    type: TxnType
    category_id: Optional[int] = None
    category_name: Optional[str] = None


class ImportTemplateValidateRequest(BaseModel):
    filename: str
    content_b64: str


class ImportTemplateValidateResponse(BaseModel):
    filename: str
    total_rows: int                                # valid + errored (not blanks)
    valid_rows: int
    errors: list[ImportRowError] = []
    sample: list[ImportTemplatePreviewRow] = []    # first 10 valid rows, for UI


class ImportTemplateConfirmRequest(BaseModel):
    filename: str
    content_b64: str


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
    projected_income: Decimal = Decimal("0")
    projected_vs_actual: Decimal = Decimal("0")    # actual - projected (positive = ahead)
    budget_total: Decimal
    budget_used: Decimal
    categories: list[CategorySummary]
    health_score: int                              # 0–100 (v1: simple savings-rate heuristic)
    ready_to_invest: bool


# ─── Recurring ─────────────────────────────────────────────────────

class RecurringIn(BaseModel):
    day_of_month: int = Field(ge=1, le=31)
    amount: Decimal = Field(gt=0)
    description: str = ""
    type: Literal["income", "expense"]
    category_id: Optional[int] = None
    active: bool = True
    note: str = ""


class RecurringPatch(BaseModel):
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)
    amount: Optional[Decimal] = Field(default=None, gt=0)
    description: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None
    category_id: Optional[int] = None
    active: Optional[bool] = None
    note: Optional[str] = None


class RecurringOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    day_of_month: int
    amount: Decimal
    description: str
    type: str
    category_id: Optional[int]
    active: bool
    note: str
    created_at: datetime


class RecurringApplyResult(BaseModel):
    inserted: int
    skipped: int
