from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db


router = APIRouter(prefix="/api/budgets/{budget_id}/categories", tags=["categories"])


def _owned_budget(budget_id: int, db: Session, user: models.User) -> models.Budget:
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.get("", response_model=list[schemas.CategoryOut])
def list_categories(
    budget_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    _owned_budget(budget_id, db, current)
    return (
        db.query(models.Category)
        .filter(models.Category.budget_id == budget_id)
        .order_by(models.Category.sort_order, models.Category.id)
        .all()
    )


@router.post("", response_model=schemas.CategoryOut, status_code=201)
def create_category(
    budget_id: int,
    payload: schemas.CategoryIn,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    _owned_budget(budget_id, db, current)
    cat = models.Category(budget_id=budget_id, **payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/{category_id}", response_model=schemas.CategoryOut)
def update_category(
    budget_id: int,
    category_id: int,
    payload: schemas.CategoryIn,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    _owned_budget(budget_id, db, current)
    cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.budget_id == budget_id,
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in payload.model_dump().items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category(
    budget_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    _owned_budget(budget_id, db, current)
    cat = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.budget_id == budget_id,
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
