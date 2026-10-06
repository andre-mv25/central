from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError

from app.db.session import get_db
from app.services import AuthService
from app.core.config import get_settings
from app.models import User
from app.schemas import UserResponse, TokenData

settings = get_settings()


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(session)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Token requerido")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Esquema de autenticación inválido")
    except ValueError:
        raise HTTPException(status_code=401, detail="Formato de token inválido")
    
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = await auth_service.get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    return current_user


def require_roles(*allowed_roles: str):
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.rol.nombre not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Se requiere uno de los roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker