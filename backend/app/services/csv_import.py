"""CSV parsing + import for bank statements.

Two flows:
- Template flow (primary): fixed headers `date,amount,description,type,category`.
  Strict row-level validation, category name → id resolution, per-row errors.
- Mapping flow (legacy bank-export path): sniff dialect, pick columns, infer
  income/expense from amount sign. Kept for raw bank CSVs.

Dedup is best-effort via `external_id` (hash of date|amount|description).
"""
from __future__ import annotations

import base64
import csv
import hashlib
import io
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Iterable, Optional


FIELD_HINTS: dict[str, tuple[str, ...]] = {
    "date": ("date", "posted", "posting date", "transaction date", "fecha"),
    "amount": ("amount", "value", "debit", "credit", "importe", "monto"),
    "description": ("description", "memo", "details", "narrative", "concepto", "descripcion"),
}

DATE_FORMATS = (
    "%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y",
    "%m-%d-%Y", "%d-%m-%Y", "%Y-%m-%dT%H:%M:%S",
)


@dataclass
class ParsedRow:
    date: Optional[date]
    amount: Optional[Decimal]
    description: str
    type: Optional[str]
    raw: dict


def _decode(content_b64: str) -> str:
    raw = base64.b64decode(content_b64)
    # Try utf-8, fall back to latin-1 (common in Spanish bank exports).
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1", errors="replace")


def _sniff_reader(text: str) -> csv.DictReader:
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    return csv.DictReader(io.StringIO(text), dialect=dialect)


def _guess_mapping(columns: list[str]) -> dict[str, Optional[str]]:
    mapping: dict[str, Optional[str]] = {"date": None, "amount": None, "description": None}
    lowered = {c: c.lower().strip() for c in columns}
    for field, hints in FIELD_HINTS.items():
        for col, low in lowered.items():
            if any(hint in low for hint in hints):
                mapping[field] = col
                break
    return mapping


def _parse_date(value: str) -> Optional[date]:
    value = (value or "").strip()
    if not value:
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


_AMOUNT_CLEAN = re.compile(r"[^0-9,.\-]")


def _parse_amount(value: str) -> Optional[Decimal]:
    if value is None:
        return None
    s = _AMOUNT_CLEAN.sub("", str(value)).strip()
    if not s:
        return None
    # Heuristic: if comma is the decimal separator (e.g. "1.234,56"), normalize.
    if s.count(",") == 1 and (s.count(".") == 0 or s.rfind(",") > s.rfind(".")):
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", "")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _parse_row(raw: dict, mapping: dict[str, Optional[str]]) -> ParsedRow:
    date_col = mapping.get("date")
    amount_col = mapping.get("amount")
    desc_col = mapping.get("description")

    parsed_date = _parse_date(raw.get(date_col, "")) if date_col else None
    parsed_amount = _parse_amount(raw.get(amount_col, "")) if amount_col else None
    description = (raw.get(desc_col, "") if desc_col else "") or ""

    txn_type: Optional[str] = None
    normalized_amount = parsed_amount
    if parsed_amount is not None:
        if parsed_amount < 0:
            txn_type = "expense"
            normalized_amount = -parsed_amount
        else:
            txn_type = "income"
            normalized_amount = parsed_amount

    return ParsedRow(
        date=parsed_date,
        amount=normalized_amount,
        description=description.strip(),
        type=txn_type,
        raw=raw,
    )


def preview(filename: str, content_b64: str, sample_size: int = 5) -> dict:
    text = _decode(content_b64)
    reader = _sniff_reader(text)
    columns = reader.fieldnames or []
    mapping = _guess_mapping(columns)

    rows = list(reader)
    samples = [_parse_row(r, mapping) for r in rows[:sample_size]]
    return {
        "filename": filename,
        "columns": columns,
        "suggested_mapping": mapping,
        "sample_rows": [
            {
                "date": s.date,
                "amount": s.amount,
                "description": s.description,
                "type": s.type,
                "raw": s.raw,
            }
            for s in samples
        ],
        "total_rows": len(rows),
    }


def iter_rows(content_b64: str, mapping: dict[str, str]) -> Iterable[ParsedRow]:
    text = _decode(content_b64)
    reader = _sniff_reader(text)
    for raw in reader:
        yield _parse_row(raw, mapping)


def external_id(row: ParsedRow) -> str:
    key = f"{row.date}|{row.amount}|{row.description}".encode()
    return hashlib.sha1(key).hexdigest()


# ─── Template flow ─────────────────────────────────────────────────

TEMPLATE_HEADERS = ["date", "amount", "description", "type", "category"]

TEMPLATE_SAMPLE_ROWS = [
    ["2026-04-01", "2500.00", "Paycheck", "income", ""],
    ["2026-04-02", "1200.00", "Rent", "expense", "Housing"],
    ["2026-04-03", "45.30", "Groceries", "expense", "Food"],
]


@dataclass
class TemplateRow:
    date: date
    amount: Decimal
    description: str
    type: str                 # "income" | "expense"
    category_id: Optional[int]


@dataclass
class RowError:
    row: int                  # 1-based, counting header as row 1
    field: str
    message: str


def build_template_csv() -> str:
    """Return a ready-to-download CSV string with headers + a few example rows."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(TEMPLATE_HEADERS)
    for row in TEMPLATE_SAMPLE_ROWS:
        writer.writerow(row)
    return buf.getvalue()


def _normalize_header(h: str) -> str:
    return (h or "").strip().lower().lstrip("\ufeff")


def validate_template(
    content_b64: str,
    category_name_to_id: dict[str, int],
) -> tuple[list[TemplateRow], list[RowError], list[str]]:
    """Parse a template CSV strictly.

    Returns (valid_rows, errors, header_warnings).
    A file with missing required headers returns empty rows + a single error
    at row 1 describing the problem.
    """
    text = _decode(content_b64)
    reader = csv.reader(io.StringIO(text))
    try:
        header = next(reader)
    except StopIteration:
        return [], [RowError(row=1, field="file", message="File is empty")], []

    normalized = [_normalize_header(h) for h in header]
    missing = [h for h in ("date", "amount", "description", "type") if h not in normalized]
    if missing:
        return [], [RowError(
            row=1,
            field="header",
            message=f"Missing required column(s): {', '.join(missing)}. "
                    f"Expected headers: {', '.join(TEMPLATE_HEADERS)}",
        )], []

    idx = {h: normalized.index(h) for h in TEMPLATE_HEADERS if h in normalized}
    lowered_cats = {k.lower(): v for k, v in category_name_to_id.items()}

    valid: list[TemplateRow] = []
    errors: list[RowError] = []
    warnings: list[str] = []

    for i, raw in enumerate(reader, start=2):  # start=2 because header is row 1
        if not any((c or "").strip() for c in raw):
            continue  # skip blank lines

        def col(name: str) -> str:
            j = idx.get(name)
            if j is None or j >= len(raw):
                return ""
            return (raw[j] or "").strip()

        date_str = col("date")
        amount_str = col("amount")
        description = col("description")
        type_str = col("type").lower()
        category_str = col("category")

        row_errs: list[RowError] = []

        parsed_date = _parse_date(date_str)
        if parsed_date is None:
            row_errs.append(RowError(row=i, field="date", message=f"Invalid date '{date_str}' (use YYYY-MM-DD)"))

        parsed_amount = _parse_amount(amount_str)
        if parsed_amount is None:
            row_errs.append(RowError(row=i, field="amount", message=f"Invalid amount '{amount_str}'"))
        elif parsed_amount <= 0:
            row_errs.append(RowError(row=i, field="amount", message="Amount must be greater than zero"))

        if type_str not in ("income", "expense"):
            row_errs.append(RowError(row=i, field="type", message=f"Type must be 'income' or 'expense' (got '{type_str}')"))

        if not description:
            row_errs.append(RowError(row=i, field="description", message="Description is required"))

        category_id: Optional[int] = None
        if category_str:
            category_id = lowered_cats.get(category_str.lower())
            if category_id is None:
                row_errs.append(RowError(
                    row=i,
                    field="category",
                    message=f"Unknown category '{category_str}'. Create it first or leave blank.",
                ))

        if row_errs:
            errors.extend(row_errs)
            continue

        valid.append(TemplateRow(
            date=parsed_date,
            amount=parsed_amount,
            description=description,
            type=type_str,
            category_id=category_id,
        ))

    return valid, errors, warnings


def template_external_id(row: TemplateRow) -> str:
    key = f"{row.date}|{row.amount}|{row.description}".encode()
    return hashlib.sha1(key).hexdigest()
