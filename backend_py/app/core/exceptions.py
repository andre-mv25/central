from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class DomainException(HTTPException):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.details = details


class NotFoundError(DomainException):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource} no encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "id": str(identifier)},
        )


class ConflictError(DomainException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class ValidationError(DomainException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class InsufficientStockError(DomainException):
    def __init__(self, available: float, requested: float, product_name: str):
        super().__init__(
            code="INSUFFICIENT_STOCK",
            message=f"Stock insuficiente para {product_name}. Disponible: {available} kg, Solicitado: {requested} kg",
            status_code=status.HTTP_409_CONFLICT,
            details={"available": available, "requested": requested, "product": product_name},
        )


class BalanceError(DomainException):
    def __init__(self, difference: float, tolerance: float):
        super().__init__(
            code="BALANCE_MISMATCH",
            message=f"El balance no cuadra. Diferencia: {difference} kg (tolerancia: {tolerance} kg)",
            status_code=status.HTTP_409_CONFLICT,
            details={"difference": difference, "tolerance": tolerance},
        )


class SaleAlreadyVoidedError(DomainException):
    def __init__(self, sale_id: int):
        super().__init__(
            code="SALE_ALREADY_VOIDED",
            message=f"La venta {sale_id} ya está anulada",
            status_code=status.HTTP_409_CONFLICT,
            details={"sale_id": sale_id},
        )


class UnauthorizedError(DomainException):
    def __init__(self, message: str = "Credenciales inválidas"):
        super().__init__(
            code="UNAUTHORIZED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(DomainException):
    def __init__(self, message: str = "No tiene permisos para esta acción"):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


async def domain_exception_handler(request: Request, exc: DomainException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(code=exc.code, message=exc.detail, details=exc.details).model_dump(),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(code="HTTP_ERROR", message=str(exc.detail)).model_dump(),
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            code="VALIDATION_ERROR",
            message="Datos de entrada inválidos",
            details={"errors": str(exc)},
        ).model_dump(),
    )