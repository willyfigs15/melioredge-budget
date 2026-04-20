from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("", response_model=list[schemas.BudgetOut])
def list_budgets(
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.Budget)
        .filter(models.Budget.user_id == current.id)
        .order_by(models.Budget.year.desc(), models.Budget.month.desc())
        .all()
    )


@router.get("/{budget_id}", response_model=schemas.BudgetOut)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.get("/by-period/{year}/{month}", response_model=schemas.BudgetOut)
def get_by_period(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    budget = db.query(models.Budget).filter(
        models.Budget.user_id == current.id,
        models.Budget.year == year,
        models.Budget.month == month,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="No budget for that period")
    return budget


@router.post("", response_model=schemas.BudgetOut, status_code=201)
def create_budget(
    payload: schemas.BudgetIn,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    budget = models.Budget(
        user_id=current.id,
        year=payload.year,
        month=payload.month,
        name=payload.name,
    )
    db.add(budget)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Budget for that month already exists")
    db.refresh(budget)
    return budget


@router.post("/duplicate", response_model=schemas.BudgetOut, status_code=201)
def duplicate_budget(
    payload: schemas.BudgetDuplicateRequest,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    """Clone a budget (with all categories) into a new year/month."""
    source = db.query(models.Budget).filter(
        models.Budget.id == payload.source_budget_id,
        models.Budget.user_id == current.id,
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source budget not found")

    new_budget = models.Budget(
        user_id=current.id,
        year=payload.year,
        month=payload.month,
        name=payload.name or source.name,
    )
    db.add(new_budget)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Budget for that month already exists")

    for cat in source.categories:
        db.add(models.Category(
            budget_id=new_budget.id,
            name=cat.name,
            limit_amount=cat.limit_amount,
            color=cat.color,
            icon=cat.icon,
            sort_order=cat.sort_order,
        ))
    db.commit()
    db.refresh(new_budget)
    return new_budget


@router.patch("/{budget_id}", response_model=schemas.BudgetOut)
def update_budget(
    budget_id: int,
    payload: schemas.BudgetPatch,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(budget, k, v)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Another budget for that period already exists")
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
