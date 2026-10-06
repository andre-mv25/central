from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum


class RoleEnum(str, Enum):
    ADMIN = "admin"
    ALMACENISTA = "almacenista"
    VENDEDOR = "vendedor"
    SOLO_LECTURA = "solo_lectura"


class RoleBase(BaseModel):
    nombre: str = Field(..., max_length=50)


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    username: str = Field(..., max_length=255)
    rol_id: int
    activo: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, max_length=255)
    rol_id: Optional[int] = None
    activo: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)


class UserResponse(UserBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime
    rol: Optional[RoleResponse] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    rol: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(Token):
    user: UserResponse