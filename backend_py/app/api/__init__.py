from fastapi import APIRouter

from app.api.v1 import auth, inventario, ventas, clasificacion, reportes

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
api_router.include_router(inventario.router, prefix="/inventario", tags=["Inventario"])
api_router.include_router(ventas.router, prefix="/ventas", tags=["Ventas"])
api_router.include_router(clasificacion.router, prefix="/clasificacion", tags=["Clasificación"])
api_router.include_router(reportes.router, prefix="/reportes", tags=["Reportes"])