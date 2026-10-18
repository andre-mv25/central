export interface Usuario {
  id: number;
  email: string;
  rol: string;
}

export interface Clase {
  id: number;
  nombre_clase: string;
}

export interface Calidad {
  id: number;
  nombre_calidad: string;
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
  calidad_id: number;
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
  calidad: string;
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
  compradorNombre: string;
  claseNombre: string;
  calidadNombre: string;
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

export interface EntradaMercancia {
  id: number;
  proveedor_id: number;
  clase_id: number;
  calidad_id: number;
  usuario_registro_id: number;
  bolsas: number;
  kilos: string;
  precio: string;
  total: string;
  fecha: string;
  observaciones: string | null;
  creado_at: string;
  actualizado_at: string;
  proveedor: string;
  sucursal: string;
  clase: string;
  calidad: string;
  usuario: string;
}

export interface FilaEntrada {
  id: string;
  proveedorNombre: string;
  claseNombre: string;
  calidadNombre: string;
  bolsas: number | null;
  kilos: number | null;
  precio: number | null;
  observaciones: string;
}

export interface StockActual {
  clase_id: number;
  nombre_clase: string;
  calidad_id: number;
  nombre_calidad: string;
  kilos_entrados: number;
  kilos_vendidos: number;
  stock_kilos: number;
  bolsas_entradas: number;
  bolsas_vendidas: number;
  stock_bolsas: number;
}
