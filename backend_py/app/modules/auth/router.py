from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedError
from app.modules.auth.schemas import UserCreate, UserUpdate, UserResponse, LoginRequest, LoginResponse
from app.modules.auth.service import AuthService


router = APIRouter(prefix="/auth", tags=["Autenticación"])


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(session)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    if not authorization:
        raise UnauthorizedError("Token requerido")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise UnauthorizedError("Esquema de autenticación inválido")
    except ValueError:
        raise UnauthorizedError("Formato de token inválido")
    
    user = await auth_service.get_current_user(token)
    if not user:
        raise UnauthorizedError("Token inválido o usuario no encontrado")
    
    return user


async def get_current_active_user(
    current_user: UserResponse = Depends(get_current_user)
) -> UserResponse:
    if not current_user.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    return current_user


def require_roles(*allowed_roles: str):
    async def role_checker(current_user: UserResponse = Depends(get_current_active_user)) -> UserResponse:
        if current_user.rol and current_user.rol.nombre not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Se requiere uno de los roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.login(credentials)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.create_user(user_in)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserResponse = Depends(get_current_active_user)
):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_in: UserUpdate,
    current_user: UserResponse = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    user = await auth_service.update_user(current_user.id, user_in)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user