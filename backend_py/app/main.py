from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import (
    get_settings,
    init_db,
    setup_logging,
    domain_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    DomainException,
    HTTPException,
)
from app.modules.auth import router as auth_router
from app.modules.products import router as products_router
from app.modules.lots import router as lots_router
from app.modules.stock import router as stock_router
from app.modules.classification import router as classification_router
from app.modules.sales import router as sales_router
from app.modules.reports import router as reports_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    await init_db()
    yield
    # Shutdown
    from app.core.database import engine
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema de inventario para tienda y producción de papa",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(DomainException, domain_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, validation_exception_handler)

# Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(lots_router, prefix="/api/v1")
app.include_router(stock_router, prefix="/api/v1")
app.include_router(classification_router, prefix="/api/v1")
app.include_router(sales_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}


@app.get("/")
async def root():
    return {"message": "Inventario Papa API", "version": settings.APP_VERSION}