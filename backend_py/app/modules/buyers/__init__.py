# Buyers functionality is integrated into the sales module
# Re-export for convenience
from app.modules.sales import (
    CompradorCreate, CompradorUpdate, CompradorResponse, CompradorAutocomplete,
    CompradorRepository, Comprador,
)

__all__ = [
    "CompradorCreate",
    "CompradorUpdate",
    "CompradorResponse",
    "CompradorAutocomplete",
    "CompradorRepository",
    "Comprador",
]