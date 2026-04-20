from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/recurring", tags=["recurring"])


def _validate_category(db: Session, user: models.User, category_id: int | None) -> None:
    if category_id is None:
        return
    owned = db.query(models.Category).join(models.Budget).filter(
        models.Category.id == category_id,
        models.Budget.user_id == user.id,
    ).first()
    if not owned:
        raise HTTPException(status_code=400, detail="Invalid category")


@router.get("", response_model=list[schemas.RecurringOut])
def list_recurring(
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.RecurringTransaction)
        .filter(models.RecurringTransaction.user_id == current.id)
        .order_by(models.RecurringTransaction.day_of_month, models.RecurringTransaction.id)
        .all()
    )


@router.post("", response_model=schemas.RecurringOut, status_code=201)
def create_recurring(
    payload: schemas.RecurringIn,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    _validate_category(db, current, payload.category_id)
    item = models.RecurringTransaction(user_id=current.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=schemas.RecurringOut)
def update_recurring(
    item_id: int,
    payload: schemas.RecurringPatch,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    item = db.query(models.RecurringTransaction).filter(
        models.RecurringTransaction.id == item_id,
        models.RecurringTransaction.user_id == current.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring not found")

    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        _validate_category(db, current, data["category_id"])
    for k, v in data.items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_recurring(
    item_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    item = db.query(models.RecurringTransaction).filter(
        models.RecurringTransaction.id == item_id,
        models.RecurringTransaction.user_id == current.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring not found")
    db.delete(item)
    db.commit()


@router.post("/apply/{year}/{month}", response_model=schemas.RecurringApplyResult)
def apply_recurring(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    """Materialize active recurring templates as real transactions for a month.

    Idempotent: skips rows already inserted (same amount + description + date).
    """
    if not (1 <= month <= 12) or not (1970 <= year <= 2100):
        raise HTTPException(status_code=400, detail="Invalid year/month")

    templates = db.query(models.RecurringTransaction).filter(
        models.RecurringTransaction.user_id == current.id,
        models.RecurringTransaction.active == True,  # noqa: E712
    ).all()

    last_day = monthrange(year, month)[1]
    inserted = 0
    skipped = 0

    for tpl in templates:
        day = min(tpl.day_of_month, last_day)
        txn_date = date(year, month, day)

        exists = db.query(models.Transaction).filter(
            models.Transaction.user_id == current.id,
            models.Transaction.date == txn_date,
            models.Transaction.amount == tpl.amount,
            models.Transaction.description == tpl.description,
            models.Transaction.type == tpl.type,
        ).first()
        if exists:
            skipped += 1
            continue

        db.add(models.Transaction(
            user_id=current.id,
            category_id=tpl.category_id,
            date=txn_date,
            amount=tpl.amount,
            description=tpl.description,
            type=tpl.type,
            source="recurring",
        ))
        inserted += 1

    db.commit()
    return schemas.RecurringApplyResult(inserted=inserted, skipped=skipped)
