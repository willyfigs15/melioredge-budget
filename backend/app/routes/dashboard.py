"""Monthly dashboard summary: income vs expense, budget vs actual, simple health score."""
from calendar import monthrange
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _health_score(income: Decimal, expense: Decimal, budget_total: Decimal, budget_used: Decimal) -> int:
    """Tiny heuristic MVP score (0–100). Replaced by a smarter model later.

    - 50 points from savings rate (capped at 30% savings)
    - 30 points from staying under monthly budget
    - 20 points for having any budget set at all
    """
    score = 0
    if income > 0:
        savings_rate = float((income - expense) / income)
        score += max(0, min(50, int(savings_rate / 0.30 * 50)))
    if budget_total > 0:
        score += 20
        if budget_used <= budget_total:
            usage = float(budget_used / budget_total) if budget_total > 0 else 1.0
            score += int((1 - usage) * 30)
    return max(0, min(100, score))


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])

    totals = db.query(
        models.Transaction.type,
        func.coalesce(func.sum(models.Transaction.amount), 0),
    ).filter(
        models.Transaction.user_id == current.id,
        models.Transaction.date >= start,
        models.Transaction.date <= end,
    ).group_by(models.Transaction.type).all()

    total_income = Decimal("0")
    total_expense = Decimal("0")
    for t, amt in totals:
        if t == "income":
            total_income = Decimal(amt)
        elif t == "expense":
            total_expense = Decimal(amt)

    budget = db.query(models.Budget).filter(
        models.Budget.user_id == current.id,
        models.Budget.year == year,
        models.Budget.month == month,
    ).first()

    category_summaries: list[schemas.CategorySummary] = []
    budget_total = Decimal("0")
    budget_used = Decimal("0")

    if budget:
        spent_by_cat = dict(
            db.query(
                models.Transaction.category_id,
                func.coalesce(func.sum(models.Transaction.amount), 0),
            ).filter(
                models.Transaction.user_id == current.id,
                models.Transaction.date >= start,
                models.Transaction.date <= end,
                models.Transaction.type == "expense",
            ).group_by(models.Transaction.category_id).all()
        )
        for cat in budget.categories:
            spent = Decimal(spent_by_cat.get(cat.id, 0))
            limit = Decimal(cat.limit_amount)
            budget_total += limit
            budget_used += spent
            percent = float(spent / limit * 100) if limit > 0 else 0.0
            category_summaries.append(schemas.CategorySummary(
                category_id=cat.id,
                name=cat.name,
                color=cat.color,
                limit_amount=limit,
                spent=spent,
                remaining=limit - spent,
                percent_used=round(percent, 1),
            ))

    health = _health_score(total_income, total_expense, budget_total, budget_used)
    balance = total_income - total_expense
    # "Ready to invest" = savings rate ≥ 20% AND staying under budget AND has surplus
    savings_rate = float(balance / total_income) if total_income > 0 else 0
    ready = savings_rate >= 0.20 and (budget_total == 0 or budget_used <= budget_total) and balance > 0

    return schemas.DashboardSummary(
        year=year,
        month=month,
        total_income=total_income,
        total_expense=total_expense,
        balance=balance,
        budget_total=budget_total,
        budget_used=budget_used,
        categories=category_summaries,
        health_score=health,
        ready_to_invest=ready,
    )
