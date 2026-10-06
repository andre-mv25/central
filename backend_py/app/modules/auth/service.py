from typing import Optional
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.modules.auth.repository import AuthRepository
from app.modules.auth.models import User
from app.modules.auth.schemas import UserCreate, UserUpdate, LoginRequest, TokenData, LoginResponse, UserResponse, RoleResponse
from app.core.exceptions import UnauthorizedError, ConflictError


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = AuthRepository(session)

    def _user_to_response(self, user: User) -> UserResponse:
        """Convert User SQLAlchemy model to UserResponse schema."""
        return UserResponse(
            id=user.id,
            username=user.username,
            rol_id=user.rol_id,
            activo=user.activo,
            creado_en=user.creado_en,
            actualizado_en=user.actualizado_en,
            rol=RoleResponse.model_validate(user.rol) if user.rol else None,
        )

    async def authenticate(self, username: str, password: str) -> Optional[UserResponse]:
        user = await self.repository.get_user_by_username(username)
        if not user or not user.activo:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return self._user_to_response(user)

    async def login(self, credentials: LoginRequest) -> LoginResponse:
        user = await self.authenticate(credentials.username, credentials.password)
        if not user:
            raise UnauthorizedError("Credenciales inválidas")
        
        token_data = {"sub": str(user.id), "username": user.username, "rol": user.rol.nombre if user.rol else "unknown"}
        access_token = create_access_token(token_data)
        
        return LoginResponse(
            access_token=access_token,
            expires_in=480 * 60,
            user=user
        )

    async def create_user(self, user_in: UserCreate) -> UserResponse:
        existing = await self.repository.get_user_by_username(user_in.username)
        if existing:
            raise ConflictError(f"El usuario {user_in.username} ya está registrado")
        
        user_data = user_in.model_dump()
        password = user_data.pop("password")
        user_data["password_hash"] = get_password_hash(password)
        
        user = await self.repository.create_user(user_data)
        return self._user_to_response(user)

    async def get_current_user(self, token: str) -> Optional[UserResponse]:
        payload = decode_token(token)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return None
        user = await self.repository.get_user_by_id(user_id)
        if not user or not user.activo:
            return None
        return self._user_to_response(user)

    async def update_user(self, user_id: int, user_in: UserUpdate) -> Optional[UserResponse]:
        user = await self.repository.get_user_by_id(user_id)
        if not user:
            return None
        
        update_data = user_in.model_dump(exclude_unset=True)
        if "password" in update_data:
            password = update_data.pop("password")
            update_data["password_hash"] = get_password_hash(password)
        
        user = await self.repository.update_user(user, update_data)
        return UserResponse.model_validate(user)