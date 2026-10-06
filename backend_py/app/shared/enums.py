from enum import Enum


class RoleEnum(str, Enum):
    ADMIN = "admin"
    ALMACENISTA = "almacenista"
    VENDEDOR = "vendedor"
    SOLO_LECTURA = "solo_lectura"


class MovimientoTipo(str, Enum):
    ENTRADA_COMPRA = "entrada_compra"
    SALIDA_VENTA = "salida_venta"
    ENTRADA_CLASIFICACION = "entrada_clasificacion"
    SALIDA_CLASIFICACION = "salida_clasificacion"
    MERMA = "merma"
    AJUSTE_INVENTARIO = "ajuste_inventario"
    TRASLADO_ENTRADA = "traslado_entrada"
    TRASLADO_SALIDA = "salida_traslado"


class VentaEstado(str, Enum):
    COMPLETADA = "completada"
    ANULADA = "anulada"


class OrdenEstado(str, Enum):
    BORRADOR = "borrador"
    CERRADA = "cerrada"
    CANCELADA = "cancelada"


class ProductoEstado(str, Enum):
    DISPONIBLE = "disponible"
    CUARENTENA = "cuarentena"
    BLOQUEADO = "bloqueado"
    RESERVADO = "reservado"
    EN_TRANSITO = "en_transito"
    MERMA = "merma"
    DEVUELTO = "devuelto"


class ReservaEstado(str, Enum):
    ACTIVA = "activa"
    CONFIRMADA = "confirmada"
    LIBERADA = "liberada"
    VENCIDA = "vencida"
    PARCIAL = "parcial"


class ReservaOrigen(str, Enum):
    VENTA = "venta"
    TRANSFERENCIA = "transferencia"
    PRODUCCION = "produccion"
    AJUSTE = "ajuste"
    MANUAL = "manual"


class AjusteTipo(str, Enum):
    ENTRADA = "entrada"
    SALIDA = "salida"