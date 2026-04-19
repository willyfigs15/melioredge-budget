"""Auth for the Budget app.

Budget never issues passwords — it consumes the dashboard's short-lived
`handoff` JWT, mints its own access token, and sets a session cookie.
Both tokens are HS256-signed with the SAME SECRET_KEY as dashboard.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/handoff", auto_error=False)


def _encode(payload: dict, expires_delta: timedelta) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + expires_delta
    data["iat"] = datetime.utcnow()
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _encode(
        {"sub": str(user_id), "type": "access", "app": settings.APP_ID},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def verify_handoff(token: str) -> Optional[dict]:
    """Returns the payload if the token is a valid dashboard handoff for budget."""
    payload = decode_token(token)
    if not payload:
        return None
    if payload.get("type") != "handoff":
        return None
    if payload.get("app") != settings.APP_ID:
        return None
    app_access = payload.get("app_access") or []
    if settings.APP_ID not in app_access:
        return None
    return payload


def upsert_user_from_handoff(payload: dict, db: Session) -> models.User:
    user_id = int(payload["sub"])
    user = db.query(models.User).filter(models.User.id == user_id).first()
    now = datetime.utcnow()
    if user:
        user.email = payload.get("email", user.email)
        user.name = payload.get("name", user.name)
        user.last_seen_at = now
    else:
        user = models.User(
            id=user_id,
            email=payload.get("email", ""),
            name=payload.get("name", ""),
            last_seen_at=now,
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _extract_access_token(request: Request, header_token: Optional[str]) -> Optional[str]:
    cookie_token = request.cookies.get(settings.COOKIE_ACCESS_NAME)
    if cookie_token:
        return cookie_token
    return header_token or None


def get_current_user(
    request: Request,
    header_token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    token = _extract_access_token(request, header_token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access" or payload.get("app") != settings.APP_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
