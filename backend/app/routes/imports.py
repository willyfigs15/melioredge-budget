import base64
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.database import get_db
from app.services import csv_import


router = APIRouter(prefix="/api/imports", tags=["imports"])

MAX_BYTES = 10 * 1024 * 1024   # 10 MB


def _user_category_map(db: Session, user_id: int) -> dict[str, int]:
    rows = (
        db.query(models.Category.name, models.Category.id)
        .join(models.Budget)
        .filter(models.Budget.user_id == user_id)
        .all()
    )
    # Later budgets overwrite earlier ones for the same name — that's fine,
    # any match gets accepted.
    return {name: cid for name, cid in rows}


@router.get("/template")
def download_template(current: models.User = Depends(auth.get_current_user)):
    csv_text = csv_import.build_template_csv()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="melioredge-budget-template.csv"'},
    )


@router.post("/template/validate", response_model=schemas.ImportTemplateValidateResponse)
async def validate_template_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    content_b64 = base64.b64encode(data).decode()

    cat_map = _user_category_map(db, current.id)
    id_to_name = {v: k for k, v in cat_map.items()}
    valid, errors, _ = csv_import.validate_template(content_b64, cat_map)

    sample = [
        schemas.ImportTemplatePreviewRow(
            date=r.date,
            amount=r.amount,
            description=r.description,
            type=r.type,
            category_id=r.category_id,
            category_name=id_to_name.get(r.category_id) if r.category_id else None,
        )
        for r in valid[:10]
    ]

    return schemas.ImportTemplateValidateResponse(
        filename=file.filename or "upload.csv",
        total_rows=len(valid) + len({e.row for e in errors}),
        valid_rows=len(valid),
        errors=[schemas.ImportRowError(row=e.row, field=e.field, message=e.message) for e in errors],
        sample=sample,
    )


@router.post("/template/confirm", response_model=schemas.ImportOut)
def confirm_template_upload(
    payload: schemas.ImportTemplateConfirmRequest,
    db: Session = Depends(get_db),
    current: models.User = Depends(auth.get_current_user),
):
    cat_map = _user_category_map(db, current.id)
    valid, errors, _ = csv_import.validate_template(payload.content_b64, cat_map)
    if errors:
        raise HTTPException(
            status_code=400,
            detail=f"{len(errors)} row(s) have errors — please fix the CSV and re-upload.",
        )

    import_row = models.Import(
        user_id=current.id,
        filename=payload.filename,
        status="pending",
    )
    db.add(import_row)
    db.flush()

    existing_ext_ids = {
        r[0] for r in db.query(models.Transaction.external_id)
        .filter(models.Transaction.user_id == current.id)
        .filter(models.Transaction.external_id != "")
        .all()
    }

    imported = 0
    skipped = 0
    try:
        for row in valid:
            ext_id = csv_import.template_external_id(row)
            if ext_id in existing_ext_ids:
                skipped += 1
                continue
            db.add(models.Transaction(
                user_id=current.id,
                category_id=row.category_id,
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

        import_row.rows_total = len(valid)
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
