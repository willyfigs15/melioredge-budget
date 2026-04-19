import base64
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db
from app.services import csv_import


router = APIRouter(prefix="/api/imports", tags=["imports"])

MAX_BYTES = 10 * 1024 * 1024   # 10 MB


@router.post("/preview", response_model=schemas.ImportPreviewResponse)
async def preview_upload(
    file: UploadFile = File(...),
    current: models.User = Depends(auth.get_current_user),
):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    content_b64 = base64.b64encode(data).decode()
    try:
        result = csv_import.preview(file.filename or "upload.csv", content_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")
    # Attach the base64 payload so the client can round-trip it on confirm
    # without re-uploading.
    result["_content_b64"] = content_b64
    return result


@router.post("/confirm", response_model=schemas.ImportOut)
def confirm_import(
    payload: schemas.ImportConfirmRequest,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    for required in ("date", "amount", "description"):
        if required not in payload.mapping:
            raise HTTPException(status_code=400, detail=f"Mapping missing field: {required}")

    if payload.default_category_id is not None:
        owned = db.query(models.Category).join(models.Budget).filter(
            models.Category.id == payload.default_category_id,
            models.Budget.user_id == current.id,
        ).first()
        if not owned:
            raise HTTPException(status_code=400, detail="Invalid default category")

    import_row = models.Import(
        user_id=current.id,
        filename=payload.filename,
        status="pending",
    )
    db.add(import_row)
    db.flush()

    imported = 0
    skipped = 0
    total = 0
    existing_ext_ids = {
        r[0] for r in db.query(models.Transaction.external_id)
        .filter(models.Transaction.user_id == current.id)
        .filter(models.Transaction.external_id != "")
        .all()
    }

    try:
        for row in csv_import.iter_rows(payload.content_b64, payload.mapping):
            total += 1
            if row.date is None or row.amount is None or row.type is None:
                skipped += 1
                continue
            ext_id = csv_import.external_id(row)
            if ext_id in existing_ext_ids:
                skipped += 1
                continue
            db.add(models.Transaction(
                user_id=current.id,
                category_id=payload.default_category_id,
                import_id=import_row.id,
                date=row.date,
                amount=row.amount,
                description=row.description,
                type=row.type,
                source="import",
                external_id=ext_id,
            ))
            existing_ext_ids.add(ext_id)
            imported += 1

        import_row.rows_total = total
        import_row.rows_imported = imported
        import_row.rows_skipped = skipped
        import_row.status = "completed"
        db.commit()
        db.refresh(import_row)
        return import_row
    except Exception as e:
        db.rollback()
        import_row.status = "failed"
        import_row.error = str(e)[:2000]
        db.add(import_row)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")


@router.get("", response_model=list[schemas.ImportOut])
def list_imports(
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.Import)
        .filter(models.Import.user_id == current.id)
        .order_by(models.Import.created_at.desc())
        .limit(50)
        .all()
    )
