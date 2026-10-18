export function formatoMoneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(valor) ? valor : 0);
}

export function formatoNumero(valor: number, decimales = 2): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number.isFinite(valor) ? valor : 0);
}

export function fechaHoy(): string {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset();
  return new Date(ahora.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function nuevoIdTemporal(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
