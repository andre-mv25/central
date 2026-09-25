export interface Usuario {
  id: number;
  email: string;
  rol: string;
}

export interface Clase {
  id: number;
  nombre_clase: string;
}

export interface Comprador {
  id: number;
  nombre: string;
  telefono: string | null;
  sucursal: string;
}

export interface RegistroVenta {
  id: number;
  comprador_id: number;
  clase_id: number;
  usuario_registro_id: number;
  bolsas: number;
  kilos: string;
  precio: string;
  total: string;
  fecha: string;
  creado_at: string;
  actualizado_at: string;
  comprador: string;
  sucursal: string;
  clase: string;
  usuario: string;
}

export interface EvaluacionPrecio {
  ultimoPrecio: number | null;
  precioSugerido: number | null;
  variacionPct: number | null;
  umbral: number;
  alerta: boolean;
  mensaje: string;
}

export interface Kpis {
  fecha: string;
  sucursal: string | null;
  totalKilos: number;
  totalDinero: number;
  totalRegistros: number;
}

export interface FilaCaptura {
  id: string;
  comprador: string | null;
  clase: string | null;
  bolsas: number | null;
  kilos: number | null;
  precio: number | null;
  ultimoPrecio: number | null;
  variacionPct?: number | null;
  alertaPrecio?: boolean;
}

export interface AnomaliaBulk {
  index: number;
  mensaje: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  requiereConfirmacion?: boolean;
  evaluacion?: EvaluacionPrecio;
  anomalias?: AnomaliaBulk[];
}

export interface ProductoInventario {
  id: number;
  nombre: string;
  codigo: string | null;
  numero_lote: string | null;
  fecha_cosecha: string | null;
  fecha_caducidad: string | null;
  origen: string | null;
  unidad_medida: string;
  stock_minimo: number;
  stock_real: number;
  stock_reservado: number;
  stock_disponible: number;
  stock_actual: number; // compatibilidad: = stock_disponible
  costo_promedio: number;
  costo_ultimo: number;
  valor_stock: number;
  activo: boolean;
  estado: 'disponible' | 'cuarentena' | 'bloqueado' | 'reservado' | 'en_transito' | 'merma' | 'devuelto';
  requiere_reposicion: boolean;
}

export interface Proveedor {
  id: number;
  nombre: string;
}

export interface ReservaStock {
  id: number;
  producto_id: number;
  cantidad: number;
  estado: 'activa' | 'confirmada' | 'liberada' | 'vencida' | 'parcial';
  origen_tipo: 'venta' | 'transferencia' | 'produccion' | 'ajuste' | 'manual';
  origen_id: number | null;
  referencia: string | null;
  notas: string | null;
  usuario_creacion_id: number;
  usuario_confirmacion_id: number | null;
  fecha_vencimiento: string | null;
  creado_at: string;
  confirmado_at: string | null;
  liberado_at: string | null;
  producto?: string;
  unidad_medida?: string;
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: string;
  motivo: string | null;
  referencia: string | null;
  producto: string;
  unidad_medida: string;
  usuario: string;
  creado_at: string;
}
