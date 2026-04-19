from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.config import settings
from app.database import get_db
from app.limiter import limiter


router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_ACCESS_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **settings.cookie_kwargs,
    )


def _clear_access_cookie(response: Response) -> None:
    base = settings.cookie_kwargs
    response.delete_cookie(
        key=settings.COOKIE_ACCESS_NAME,
        path=base.get("path", "/"),
        domain=base.get("domain"),
        secure=base.get("secure", False),
        httponly=base.get("httponly", True),
        samesite=base.get("samesite", "lax"),
    )


@router.post("/handoff", response_model=schemas.HandoffVerifyResponse)
@limiter.limit("20/minute")
def verify_handoff(
    request: Request,
    response: Response,
    body: schemas.HandoffVerifyRequest,
    db: Session = Depends(get_db),
):
    payload = auth.verify_handoff(body.token)
    if not payload:
        return schemas.HandoffVerifyResponse(valid=False)

    user = auth.upsert_user_from_handoff(payload, db)
    access = auth.create_access_token(user.id)
    _set_access_cookie(response, access)

    return schemas.HandoffVerifyResponse(
        valid=True,
        user_id=user.id,
        name=user.name,
        email=user.email,
    )


@router.get("/me", response_model=schemas.MeResponse)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return schemas.MeResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
    )


@router.post("/logout")
def logout(response: Response):
    _clear_access_cookie(response)
    return {"status": "ok"}
