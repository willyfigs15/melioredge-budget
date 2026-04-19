"""CSV parsing + import for bank statements.

Strategy:
- Preview: sniff dialect, return columns + a best-guess field mapping
  (date, amount, description) + a few sample rows. User can adjust mapping
  client-side before confirming.
- Confirm: re-parse with the final mapping and insert rows in one transaction.
  `type` is inferred from the amount sign: negative = expense, positive = income.
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
