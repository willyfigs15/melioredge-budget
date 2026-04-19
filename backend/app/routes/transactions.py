from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=schemas.TransactionListOut)
def list_transactions(
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
    start: Optional[date] = None,
    end: Optional[date] = None,
    category_id: Optional[int] = None,
    type: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    q = db.query(models.Transaction).filter(models.Transaction.user_id == current.id)
    if start:
        q = q.filter(models.Transaction.date >= start)
    if end:
        q = q.filter(models.Transaction.date <= end)
    if category_id is not None:
        q = q.filter(models.Transaction.category_id == category_id)
    if type in ("income", "expense"):
        q = q.filter(models.Transaction.type == type)

    total = q.count()
    items = (
        q.order_by(models.Transaction.date.desc(), models.Transaction.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {"items": items, "total": total}


@router.post("", response_model=schemas.TransactionOut, status_code=201)
def create_transaction(
    payload: schemas.TransactionIn,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    if payload.category_id is not None:
        owned = db.query(models.Category).join(models.Budget).filter(
            models.Category.id == payload.category_id,
            models.Budget.user_id == current.id,
        ).first()
        if not owned:
            raise HTTPException(status_code=400, detail="Invalid category")

    txn = models.Transaction(
        user_id=current.id,
        date=payload.date,
        amount=payload.amount,
        description=payload.description,
        type=payload.type,
        category_id=payload.category_id,
        source="manual",
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@router.put("/{txn_id}", response_model=schemas.TransactionOut)
def update_transaction(
    txn_id: int,
    payload: schemas.TransactionIn,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == txn_id,
        models.Transaction.user_id == current.id,
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if payload.category_id is not None:
        owned = db.query(models.Category).join(models.Budget).filter(
            models.Category.id == payload.category_id,
            models.Budget.user_id == current.id,
        ).first()
        if not owned:
            raise HTTPException(status_code=400, detail="Invalid category")

    txn.date = payload.date
    txn.amount = payload.amount
    txn.description = payload.description
    txn.type = payload.type
    txn.category_id = payload.category_id
    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{txn_id}", status_code=204)
def delete_transaction(
    txn_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    txn = db.query(models.Transaction).filter(
        models.Transaction.id == txn_id,
        models.Transaction.user_id == current.id,
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
