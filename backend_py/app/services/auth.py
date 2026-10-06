from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, Role
from app.schemas import UserCreate, UserUpdate, LoginRequest, TokenData
from app.core.config import get_settings
from app.repositories.base import BaseRepository


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = BaseRepository(session, User)
        self.role_repo = BaseRepository(session, Role)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        user = await self.user_repo.get_by(email=email)
        if not user or not user.activo:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        return user

    async def create_user(self, user_in: UserCreate) -> User:
        user_data = user_in.model_dump()
        password = user_data.pop("password")
        user_data["password_hash"] = self.get_password_hash(password)
        return await self.user_repo.create(user_data)

    async def get_user(self, user_id: int) -> Optional[User]:
        return await self.user_repo.get(user_id)

    async def update_user(self, user_id: int, user_in: UserUpdate) -> Optional[User]:
        user = await self.user_repo.get(user_id)
        if not user:
            return None
        update_data = user_in.model_dump(exclude_unset=True)
        if "password" in update_data:
            password = update_data.pop("password")
            update_data["password_hash"] = self.get_password_hash(password)
        return await self.user_repo.update(user, update_data)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def decode_token(self, token: str) -> Optional[TokenData]:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id: int = payload.get("sub")
            email: str = payload.get("email")
            rol: str = payload.get("rol")
            if user_id is None:
                return None
            return TokenData(user_id=user_id, email=email, rol=rol)
        except JWTError:
            return None

    async def get_current_user(self, token: str) -> Optional[User]:
        token_data = self.decode_token(token)
        if not token_data:
            return None
        return await self.user_repo.get(token_data.user_id)