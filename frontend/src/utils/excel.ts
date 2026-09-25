import * as XLSX from 'xlsx';
import type { FilaCaptura, RegistroVenta, ProductoInventario, MovimientoInventario } from '../types';

export type ExportFormat = 'xlsx' | 'csv';

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  format: ExportFormat = 'xlsx'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  
  const outputFormat = format === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(workbook, `${filename}.${outputFormat}`);
}

export function exportCapturaToExcel(
  filas: FilaCaptura[],
  filename: string = 'captura',
  format: ExportFormat = 'xlsx'
): void {
  const data = filas.map((fila, index) => ({
    '#': index + 1,
    Comprador: fila.comprador || '',
    'Producto (manual)': fila.clase || '',
    Bolsas: fila.bolsas || '',
    Kilos: fila.kilos || '',
    Precio: fila.precio || '',
    Total: fila.bolsas && fila.kilos && fila.precio
      ? (fila.bolsas * fila.kilos * fila.precio).toFixed(2)
      : '',
    'Último Precio': fila.ultimoPrecio ?? '',
    'Variación %': fila.variacionPct ?? '',
    'Alerta Precio': fila.alertaPrecio ? '⚠️ Sí' : 'No',
  }));
  
  const totalBolsas = filas.reduce((sum, f) => sum + (f.bolsas || 0), 0);
  const totalKilos = filas.reduce((sum, f) => sum + (f.kilos || 0), 0);
  const totalImporte = filas.reduce((sum, f) => {
    if (f.bolsas && f.kilos && f.precio) return sum + (f.bolsas * f.kilos * f.precio);
    return sum;
  }, 0);
  
  const resumen = {
    'Total Filas': filas.length,
    'Total Bolsas': totalBolsas,
    'Total Kilos': totalKilos.toFixed(3),
    'Total Importe': totalImporte.toFixed(2),
    'Fecha Exportación': new Date().toLocaleString('es-MX'),
  };
  
  const porComprador = filas.reduce((acc, f) => {
    const key = f.comprador || 'Sin comprador';
    if (!acc[key]) { acc[key] = { comprador: key, bolsas: 0, kilos: 0, importe: 0, filas: 0 }; }
    acc[key].bolsas += f.bolsas || 0;
    acc[key].kilos += f.kilos || 0;
    acc[key].filas += 1;
    if (f.bolsas && f.kilos && f.precio) acc[key].importe += f.bolsas * f.kilos * f.precio;
    return acc;
  }, {} as Record<string, { comprador: string; bolsas: number; kilos: number; importe: number; filas: number }>);
  
  const dataPorComprador = Object.values(porComprador).map((v, i) => ({
    '#': i + 1,
    Comprador: v.comprador,
    Filas: v.filas,
    Bolsas: v.bolsas,
    Kilos: v.kilos.toFixed(3),
    Importe: v.importe.toFixed(2),
  }));
  
  const workbook = XLSX.utils.book_new();
  
  const wsDetalle = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle Captura');
  
  const wsResumen = XLSX.utils.json_to_sheet([resumen]);
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');
  
  const wsPorComprador = XLSX.utils.json_to_sheet(dataPorComprador);
  XLSX.utils.book_append_sheet(workbook, wsPorComprador, 'Por Comprador');
  
  const outputFormat = format === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(workbook, `${filename}.${outputFormat}`);
}

export function exportVentasToExcel(
  registros: RegistroVenta[],
  filename: string = 'ventas',
  format: ExportFormat = 'xlsx'
): void {
  const data = registros.map((reg, index) => ({
    '#': index + 1,
    ID: reg.id,
    Fecha: reg.fecha.split('T')[0],
    'Fecha Completa': new Date(reg.fecha).toLocaleString('es-MX'),
    Comprador: reg.comprador,
    Sucursal: reg.sucursal,
    Clase: reg.clase,
    Bolsas: reg.bolsas,
    Kilos: parseFloat(reg.kilos).toFixed(3),
    'Precio/Kg': parseFloat(reg.precio).toFixed(2),
    Total: parseFloat(reg.total).toFixed(2),
    'Registró': reg.usuario,
    'Creado': reg.creado_at ? new Date(reg.creado_at).toLocaleString('es-MX') : '',
    'Actualizado': reg.actualizado_at ? new Date(reg.actualizado_at).toLocaleString('es-MX') : '',
  }));
  
  const totalBolsas = registros.reduce((sum, r) => sum + r.bolsas, 0);
  const totalKilos = registros.reduce((sum, r) => sum + parseFloat(r.kilos), 0);
  const totalImporte = registros.reduce((sum, r) => sum + parseFloat(r.total), 0);
  
  const resumen = {
    'Total Ventas': registros.length,
    'Total Bolsas': totalBolsas,
    'Total Kilos': totalKilos.toFixed(3),
    'Total Importe': totalImporte.toFixed(2),
    'Precio Promedio/Kg': (totalKilos > 0 ? totalImporte / totalKilos : 0).toFixed(2),
    'Fecha Exportación': new Date().toLocaleString('es-MX'),
    'Periodo': registros.length > 0 
      ? `${registros[registros.length - 1].fecha.split('T')[0]} - ${registros[0].fecha.split('T')[0]}`
      : 'Sin datos',
  };
  
  const porComprador = registros.reduce((acc, r) => {
    const key = r.comprador;
    if (!acc[key]) { acc[key] = { comprador: key, sucursal: r.sucursal, ventas: 0, bolsas: 0, kilos: 0, importe: 0 }; }
    acc[key].ventas += 1;
    acc[key].bolsas += r.bolsas;
    acc[key].kilos += parseFloat(r.kilos);
    acc[key].importe += parseFloat(r.total);
    return acc;
  }, {} as Record<string, { comprador: string; sucursal: string; ventas: number; bolsas: number; kilos: number; importe: number }>);
  
  const dataPorComprador = Object.values(porComprador).map((v, i) => ({
    '#': i + 1,
    Comprador: v.comprador,
    Sucursal: v.sucursal,
    Ventas: v.ventas,
    Bolsas: v.bolsas,
    Kilos: v.kilos.toFixed(3),
    Importe: v.importe.toFixed(2),
    'Ticket Promedio': (v.ventas > 0 ? v.importe / v.ventas : 0).toFixed(2),
  }));
  
  const porClase = registros.reduce((acc, r) => {
    const key = r.clase;
    if (!acc[key]) { acc[key] = { clase: key, ventas: 0, bolsas: 0, kilos: 0, importe: 0 }; }
    acc[key].ventas += 1;
    acc[key].bolsas += r.bolsas;
    acc[key].kilos += parseFloat(r.kilos);
    acc[key].importe += parseFloat(r.total);
    return acc;
  }, {} as Record<string, { clase: string; ventas: number; bolsas: number; kilos: number; importe: number }>);
  
  const dataPorClase = Object.values(porClase).map((v, i) => ({
    '#': i + 1,
    'Clase/Variedad': v.clase,
    Ventas: v.ventas,
    Bolsas: v.bolsas,
    Kilos: v.kilos.toFixed(3),
    Importe: v.importe.toFixed(2),
  }));
  
  const workbook = XLSX.utils.book_new();
  
  const wsDetalle = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle Ventas');
  
  const wsResumen = XLSX.utils.json_to_sheet([resumen]);
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen General');
  
  const wsPorComprador = XLSX.utils.json_to_sheet(dataPorComprador);
  XLSX.utils.book_append_sheet(workbook, wsPorComprador, 'Por Comprador');
  
  const wsPorClase = XLSX.utils.json_to_sheet(dataPorClase);
  XLSX.utils.book_append_sheet(workbook, wsPorClase, 'Por Variedad');
  
  const outputFormat = format === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(workbook, `${filename}.${outputFormat}`);
}

export interface ImportResult<T> {
  data: T[];
  errors: string[];
}

export function importFromExcel<T>(
  file: File,
  parser: (row: Record<string, unknown>) => T | null
): Promise<ImportResult<T>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length <= 1) {
          resolve({ data: [], errors: ['El archivo está vacío o solo contiene encabezados'] });
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as unknown[][];
        
        const result: T[] = [];
        const errors: string[] = [];
        
        rows.forEach((row, rowIndex) => {
          const rowObj: Record<string, unknown> = {};
          headers.forEach((header, colIndex) => {
            rowObj[header] = row[colIndex];
          });
          
          const parsed = parser(rowObj);
          if (parsed) {
            result.push(parsed);
          } else {
            errors.push(`Fila ${rowIndex + 2}: Datos inválidos`);
          }
        });
        
        resolve({ data: result, errors });
      } catch (error) {
        reject(new Error(`Error al leer el archivo: ${error instanceof Error ? error.message : 'Desconocido'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function parseCapturaRow(row: Record<string, unknown>): FilaCaptura | null {
  const comprador = String(row.Comprador || row.comprador || '').trim();
  const clase = String(row['Producto (manual)'] || row['Clase / Variedad'] || row.Clase || row.clase || '').trim();
  const bolsas = Number(row.Bolsas || row.bolsas);
  const kilos = Number(row.Kilos || row.kilos);
  const precio = Number(row.Precio || row.precio);
  
  if (!comprador || !clase || isNaN(bolsas) || isNaN(kilos) || isNaN(precio)) {
    return null;
  }
  
  if (bolsas <= 0 || kilos <= 0 || precio <= 0) {
    return null;
  }
  
  return {
    id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    comprador,
    clase,
    bolsas,
    kilos,
    precio,
    ultimoPrecio: null,
    variacionPct: null,
    alertaPrecio: false,
  };
}

export function exportInventarioToExcel(
  productos: ProductoInventario[],
  filename: string = 'inventario',
  format: ExportFormat = 'xlsx'
): void {
  const data = productos.map((p, index) => ({
    '#': index + 1,
    ID: p.id,
    Variedad: p.nombre,
    Código: p.codigo || '—',
    'N° Lote': p.numero_lote || '—',
    'Fecha Cosecha': p.fecha_cosecha ? new Date(p.fecha_cosecha).toLocaleDateString('es-MX') : '—',
    'Fecha Caducidad': p.fecha_caducidad ? new Date(p.fecha_caducidad).toLocaleDateString('es-MX') : '—',
    Origen: p.origen || '—',
    'Stock Actual': p.stock_actual,
    'Stock Mínimo': p.stock_minimo,
    'Unidad Medida': p.unidad_medida,
    'Valor Stock Actual': Number(p.stock_actual).toFixed(3),
    Estado: p.activo ? (p.requiere_reposicion ? '⚠️ Requiere reposición' : '✅ Disponible') : '❌ Inactivo',
    'Requiere Reposición': p.requiere_reposicion ? 'Sí' : 'No',
    Activo: p.activo ? 'Sí' : 'No',
  }));
  
  const resumen = {
    'Total Variedades': productos.length,
    'Variedades Activas': productos.filter(p => p.activo).length,
    'Requieren Reposición': productos.filter(p => p.activo && p.requiere_reposicion).length,
    'Total Stock (unidades)': productos.reduce((sum, p) => sum + p.stock_actual, 0).toFixed(3),
    'Fecha Exportación': new Date().toLocaleString('es-MX'),
  };
  
  const workbook = XLSX.utils.book_new();
  
  const wsDetalle = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle Inventario');
  
  const wsResumen = XLSX.utils.json_to_sheet([resumen]);
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');
  
  const wsBajoMinimo = XLSX.utils.json_to_sheet(
    productos
      .filter(p => p.activo && p.requiere_reposicion)
      .map((p, i) => ({
        '#': i + 1,
        Variedad: p.nombre,
        Código: p.codigo || '—',
        'N° Lote': p.numero_lote || '—',
        'Fecha Caducidad': p.fecha_caducidad ? new Date(p.fecha_caducidad).toLocaleDateString('es-MX') : '—',
        Origen: p.origen || '—',
        'Stock Actual': p.stock_actual,
        'Stock Mínimo': p.stock_minimo,
        Déficit: (p.stock_minimo - p.stock_actual).toFixed(3),
        Unidad: p.unidad_medida,
      }))
  );
  XLSX.utils.book_append_sheet(workbook, wsBajoMinimo, 'Requieren Reposición');
  
  const outputFormat = format === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(workbook, `${filename}.${outputFormat}`);
}

export function exportMovimientosToExcel(
  movimientos: MovimientoInventario[],
  filename: string = 'movimientos-inventario',
  format: ExportFormat = 'xlsx'
): void {
  const data = movimientos.map((m, index) => ({
    '#': index + 1,
    ID: m.id,
    Fecha: new Date(m.creado_at).toLocaleString('es-MX'),
    'Fecha (solo día)': m.creado_at.split('T')[0],
    Variedad: m.producto,
    Tipo: m.tipo === 'salida' ? '📤 Salida' : m.tipo === 'entrada' ? '📥 Entrada' : '⚖️ Ajuste',
    'Cantidad (con signo)': (m.tipo === 'salida' ? -1 : 1) * parseFloat(m.cantidad),
    Cantidad: parseFloat(m.cantidad).toFixed(3),
    Unidad: m.unidad_medida,
    Motivo: m.motivo || '—',
    Referencia: m.referencia || '—',
    Usuario: m.usuario,
  }));
  
  const entradas = movimientos.filter(m => m.tipo === 'entrada');
  const salidas = movimientos.filter(m => m.tipo === 'salida');
  const ajustes = movimientos.filter(m => m.tipo === 'ajuste');
  
  const resumen = {
    'Total Movimientos': movimientos.length,
    Entradas: entradas.length,
    Salidas: salidas.length,
    Ajustes: ajustes.length,
    'Total Entradas (unid.)': entradas.reduce((sum, m) => sum + parseFloat(m.cantidad), 0).toFixed(3),
    'Total Salidas (unid.)': salidas.reduce((sum, m) => sum + parseFloat(m.cantidad), 0).toFixed(3),
    'Balance Neto': (
      entradas.reduce((sum, m) => sum + parseFloat(m.cantidad), 0) -
      salidas.reduce((sum, m) => sum + parseFloat(m.cantidad), 0)
    ).toFixed(3),
    'Fecha Exportación': new Date().toLocaleString('es-MX'),
    'Periodo': movimientos.length > 0 
      ? `${new Date(movimientos[movimientos.length - 1].creado_at).toLocaleDateString('es-MX')} - ${new Date(movimientos[0].creado_at).toLocaleDateString('es-MX')}`
      : 'Sin datos',
  };
  
  const porVariedad = movimientos.reduce((acc, m) => {
    const key = m.producto;
    if (!acc[key]) {
      acc[key] = { variedad: m.producto, unidad: m.unidad_medida, entradas: 0, salidas: 0, ajustes: 0, balance: 0 };
    }
    const cant = parseFloat(m.cantidad);
    if (m.tipo === 'entrada') { acc[key].entradas += cant; acc[key].balance += cant; }
    else if (m.tipo === 'salida') { acc[key].salidas += cant; acc[key].balance -= cant; }
    else { acc[key].ajustes += cant; acc[key].balance += cant; }
    return acc;
  }, {} as Record<string, { variedad: string; unidad: string; entradas: number; salidas: number; ajustes: number; balance: number }>);
  
  const dataPorVariedad = Object.values(porVariedad).map((v, i) => ({
    '#': i + 1,
    Variedad: v.variedad,
    Unidad: v.unidad,
    Entradas: v.entradas.toFixed(3),
    Salidas: v.salidas.toFixed(3),
    Ajustes: v.ajustes.toFixed(3),
    Balance: v.balance.toFixed(3),
  }));
  
  const workbook = XLSX.utils.book_new();
  
  const wsDetalle = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle Movimientos');
  
  const wsResumen = XLSX.utils.json_to_sheet([resumen]);
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen General');
  
  const wsPorVariedad = XLSX.utils.json_to_sheet(dataPorVariedad);
  XLSX.utils.book_append_sheet(workbook, wsPorVariedad, 'Resumen por Variedad');
  
  const outputFormat = format === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(workbook, `${filename}.${outputFormat}`);
}

export function parseInventarioRow(row: Record<string, unknown>): { 
  nombre: string; 
  codigo?: string; 
  numeroLote?: string;
  fechaCosecha?: string;
  fechaCaducidad?: string;
  origen?: string;
  unidadMedida: string; 
  stockMinimo: number 
} | null {
  const nombre = String(row.Variedad || row.variedad || '').trim();
  const codigo = String(row.Código || row.codigo || '').trim() || undefined;
  const numeroLote = String(row['N° Lote'] || row['Numero Lote'] || row.numeroLote || '').trim() || undefined;
  const fechaCosecha = String(row['Fecha Cosecha'] || row.fechaCosecha || '').trim() || undefined;
  const fechaCaducidad = String(row['Fecha Caducidad'] || row.fechaCaducidad || '').trim() || undefined;
  const origen = String(row.Origen || row.origen || '').trim() || undefined;
  const stockMinimo = Number(row['Stock Mínimo'] || row['Stock Minimo'] || row.stockMinimo || row['stock_minimo'] || 0);
  const unidadMedida = String(row['Unidad Medida'] || row.unidadMedida || row.unidad_medida || 'kg').trim().toLowerCase();
  
  if (!nombre) {
    return null;
  }
  
  if (isNaN(stockMinimo) || stockMinimo < 0) {
    return null;
  }
  
  const validUnidades = ['kg', 'costal', 'caja', 'unidad', 'bolsa'];
  const unidad = validUnidades.includes(unidadMedida) ? unidadMedida : 'kg';
  
  return {
    nombre,
    codigo,
    numeroLote,
    fechaCosecha,
    fechaCaducidad,
    origen,
    unidadMedida: unidad,
    stockMinimo,
  };
}

export function parseMovimientoRow(row: Record<string, unknown>, productos: ProductoInventario[]): { productoId: number; tipo: string; cantidad: number; motivo?: string; referencia?: string } | null {
  const variedad = String(row.Variedad || row.variedad || '').trim();
  const tipo = String(row.Tipo || row.tipo || '').trim().toLowerCase();
  const cantidad = Number(row.Cantidad || row.cantidad);
  const motivo = String(row.Motivo || row.motivo || '').trim() || undefined;
  const referencia = String(row.Referencia || row.referencia || '').trim() || undefined;
  
  if (!variedad || !tipo || isNaN(cantidad)) {
    return null;
  }
  
  const validTipos = ['entrada', 'salida', 'ajuste'];
  if (!validTipos.includes(tipo)) {
    return null;
  }
  
  const producto = productos.find(p => p.nombre.trim().toLowerCase() === variedad.toLowerCase());
  if (!producto) {
    return null;
  }
  
  if (tipo !== 'ajuste' && cantidad <= 0) {
    return null;
  }
  
  return {
    productoId: producto.id,
    tipo: tipo as 'entrada' | 'salida' | 'ajuste',
    cantidad,
    motivo,
    referencia,
  };
}

export interface ReporteCompletoData {
  ventas: RegistroVenta[];
  productos: ProductoInventario[];
  movimientos: MovimientoInventario[];
  fecha: string;
  kpis?: { totalKilos: number; totalDinero: number; totalRegistros: number };
}

export function exportReporteCompleto(
  data: ReporteCompletoData,
  filename: string = 'reporte-completo',
  format: ExportFormat = 'xlsx'
): void {
  const { ventas, productos, movimientos, fecha, kpis } = data;
  const fechaReporte = new Date().toLocaleString('es-MX');
  const fechaCorta = fecha.split('T')[0];
  
  const workbook = XLSX.utils.book_new();
  
  // ============================================
  // HOJA 1: PORTADA / RESUMEN EJECUTIVO
  // ============================================
  const totalVentas = ventas.length;
  const totalBolsas = ventas.reduce((sum, v) => sum + v.bolsas, 0);
  const totalKilosVentas = ventas.reduce((sum, v) => sum + parseFloat(v.kilos), 0);
  const totalImporte = ventas.reduce((sum, v) => sum + parseFloat(v.total), 0);
  const precioPromedio = totalKilosVentas > 0 ? totalImporte / totalKilosVentas : 0;
  
  const productosActivos = productos.filter(p => p.activo);
  const productosBajoMinimo = productosActivos.filter(p => p.requiere_reposicion);
  const stockTotal = productosActivos.reduce((sum, p) => sum + p.stock_actual, 0);
  
  const entradas = movimientos.filter(m => m.tipo === 'entrada');
  const salidas = movimientos.filter(m => m.tipo === 'salida');
  const ajustes = movimientos.filter(m => m.tipo === 'ajuste');
  const totalEntradas = entradas.reduce((sum, m) => sum + parseFloat(m.cantidad), 0);
  const totalSalidas = salidas.reduce((sum, m) => sum + parseFloat(m.cantidad), 0);
  
  const portada = [
    { Campo: 'REPORTE CONSOLIDADO DE VENTAS E INVENTARIO', Valor: '' },
    { Campo: '', Valor: '' },
    { Campo: 'Fecha del reporte', Valor: fechaReporte },
    { Campo: 'Fecha de operaciones', Valor: fechaCorta },
    { Campo: '', Valor: '' },
    { Campo: '=== RESUMEN DE VENTAS ===', Valor: '' },
    { Campo: 'Total de ventas registradas', Valor: totalVentas },
    { Campo: 'Total bolsas vendidas', Valor: totalBolsas },
    { Campo: 'Total kilos vendidos', Valor: totalKilosVentas.toFixed(3) },
    { Campo: 'Total importe ($)', Valor: totalImporte.toFixed(2) },
    { Campo: 'Precio promedio por kg ($)', Valor: precioPromedio.toFixed(2) },
    { Campo: '', Valor: '' },
    { Campo: '=== RESUMEN DE INVENTARIO ===', Valor: '' },
    { Campo: 'Total variedades/lotes registrados', Valor: productos.length },
    { Campo: 'Variedades activas', Valor: productosActivos.length },
    { Campo: 'Variedades que requieren reposición', Valor: productosBajoMinimo.length },
    { Campo: 'Stock total actual (unidades)', Valor: stockTotal.toFixed(3) },
    { Campo: '', Valor: '' },
    { Campo: '=== RESUMEN DE MOVIMIENTOS ===', Valor: '' },
    { Campo: 'Total movimientos', Valor: movimientos.length },
    { Campo: 'Entradas', Valor: entradas.length },
    { Campo: 'Salidas', Valor: salidas.length },
    { Campo: 'Ajustes', Valor: ajustes.length },
    { Campo: 'Total entradas (unid.)', Valor: totalEntradas.toFixed(3) },
    { Campo: 'Total salidas (unid.)', Valor: totalSalidas.toFixed(3) },
    { Campo: 'Balance neto (unid.)', Valor: (totalEntradas - totalSalidas).toFixed(3) },
  ];
  
  if (kpis) {
    portada.push(
      { Campo: '', Valor: '' },
      { Campo: '=== KPIS DEL SISTEMA ===', Valor: '' },
      { Campo: 'Total Kilos (KPI)', Valor: kpis.totalKilos.toFixed(3) },
      { Campo: 'Total Dinero (KPI)', Valor: kpis.totalDinero.toFixed(2) },
      { Campo: 'Total Registros (KPI)', Valor: kpis.totalRegistros },
    );
  }
  
  const wsPortada = XLSX.utils.json_to_sheet(portada, { header: ['Campo', 'Valor'], skipHeader: true });
  wsPortada['!cols'] = [{ wch: 40 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, wsPortada, '📊 Resumen Ejecutivo');
  
  // ============================================
  // HOJA 2: DETALLE DE VENTAS
  // ============================================
  const detalleVentas = ventas.map((v, i) => ({
    '#': i + 1,
    ID: v.id,
    Fecha: v.fecha.split('T')[0],
    Comprador: v.comprador,
    Sucursal: v.sucursal,
    Variedad: v.clase,
    Bolsas: v.bolsas,
    Kilos: parseFloat(v.kilos).toFixed(3),
    'Precio/Kg': parseFloat(v.precio).toFixed(2),
    Total: parseFloat(v.total).toFixed(2),
    Usuario: v.usuario,
  }));
  const wsVentas = XLSX.utils.json_to_sheet(detalleVentas);
  wsVentas['!cols'] = [{ wch: 5 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, wsVentas, '💰 Detalle Ventas');
  
  // ============================================
  // HOJA 3: VENTAS POR COMPRADOR
  // ============================================
  const porComprador = ventas.reduce((acc, v) => {
    const key = v.comprador;
    if (!acc[key]) { acc[key] = { comprador: key, sucursal: v.sucursal, ventas: 0, bolsas: 0, kilos: 0, importe: 0 }; }
    acc[key].ventas += 1;
    acc[key].bolsas += v.bolsas;
    acc[key].kilos += parseFloat(v.kilos);
    acc[key].importe += parseFloat(v.total);
    return acc;
  }, {} as Record<string, { comprador: string; sucursal: string; ventas: number; bolsas: number; kilos: number; importe: number }>);
  
  const dataPorComprador = Object.values(porComprador).map((v, i) => ({
    '#': i + 1,
    Comprador: v.comprador,
    Sucursal: v.sucursal,
    'N° Ventas': v.ventas,
    Bolsas: v.bolsas,
    Kilos: v.kilos.toFixed(3),
    Importe: v.importe.toFixed(2),
    'Ticket Promedio': (v.ventas > 0 ? v.importe / v.ventas : 0).toFixed(2),
  }));
  const wsPorComprador = XLSX.utils.json_to_sheet(dataPorComprador);
  wsPorComprador['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, wsPorComprador, '👥 Por Comprador');
  
  // ============================================
  // HOJA 4: VENTAS POR VARIEDAD
  // ============================================
  const porVariedadVentas = ventas.reduce((acc, v) => {
    const key = v.clase;
    if (!acc[key]) { acc[key] = { variedad: key, ventas: 0, bolsas: 0, kilos: 0, importe: 0 }; }
    acc[key].ventas += 1;
    acc[key].bolsas += v.bolsas;
    acc[key].kilos += parseFloat(v.kilos);
    acc[key].importe += parseFloat(v.total);
    return acc;
  }, {} as Record<string, { variedad: string; ventas: number; bolsas: number; kilos: number; importe: number }>);
  
  const dataPorVariedadVentas = Object.values(porVariedadVentas).map((v, i) => ({
    '#': i + 1,
    Variedad: v.variedad,
    'N° Ventas': v.ventas,
    Bolsas: v.bolsas,
    Kilos: v.kilos.toFixed(3),
    Importe: v.importe.toFixed(2),
    'Precio Promedio/Kg': (v.kilos > 0 ? v.importe / v.kilos : 0).toFixed(2),
  }));
  const wsPorVariedadVentas = XLSX.utils.json_to_sheet(dataPorVariedadVentas);
  wsPorVariedadVentas['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, wsPorVariedadVentas, '🌱 Por Variedad (Ventas)');
  
  // ============================================
  // HOJA 5: ESTADO DE INVENTARIO
  // ============================================
  const detalleInventario = productos.map((p, i) => ({
    '#': i + 1,
    ID: p.id,
    Variedad: p.nombre,
    Código: p.codigo || '—',
    'Stock Actual': p.stock_actual,
    'Stock Mínimo': p.stock_minimo,
    Unidad: p.unidad_medida,
    Estado: p.activo ? (p.requiere_reposicion ? '⚠️ Requiere reposición' : '✅ Disponible') : '❌ Inactivo',
    'Requiere Reposición': p.requiere_reposicion ? 'Sí' : 'No',
    Activo: p.activo ? 'Sí' : 'No',
  }));
  const wsInventario = XLSX.utils.json_to_sheet(detalleInventario);
  wsInventario['!cols'] = [{ wch: 5 }, { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(workbook, wsInventario, '📦 Inventario Actual');
  
  // ============================================
  // HOJA 6: PRODUCTOS BAJO MÍNIMO (URGENTE)
  // ============================================
  const bajoMinimo = productosActivos
    .filter(p => p.requiere_reposicion)
    .map((p, i) => ({
      '#': i + 1,
      Variedad: p.nombre,
      Código: p.codigo || '—',
      'Stock Actual': p.stock_actual,
      'Stock Mínimo': p.stock_minimo,
      Déficit: (p.stock_minimo - p.stock_actual).toFixed(3),
      Unidad: p.unidad_medida,
      'Prioridad': p.stock_actual === 0 ? '🔴 CRÍTICO (Sin stock)' : '🟡 BAJO MÍNIMO',
    }));
  const wsBajoMinimo = XLSX.utils.json_to_sheet(bajoMinimo);
  wsBajoMinimo['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, wsBajoMinimo, '🚨 Requieren Reposición');
  
  // ============================================
  // HOJA 7: DETALLE DE MOVIMIENTOS
  // ============================================
  const detalleMovimientos = movimientos.map((m, i) => ({
    '#': i + 1,
    ID: m.id,
    Fecha: new Date(m.creado_at).toLocaleString('es-MX'),
    Variedad: m.producto,
    Tipo: m.tipo === 'salida' ? '📤 Salida' : m.tipo === 'entrada' ? '📥 Entrada' : '⚖️ Ajuste',
    'Cantidad (signo)': (m.tipo === 'salida' ? -1 : 1) * parseFloat(m.cantidad),
    Cantidad: parseFloat(m.cantidad).toFixed(3),
    Unidad: m.unidad_medida,
    Motivo: m.motivo || '—',
    Referencia: m.referencia || '—',
    Usuario: m.usuario,
  }));
  const wsMovimientos = XLSX.utils.json_to_sheet(detalleMovimientos);
  wsMovimientos['!cols'] = [{ wch: 5 }, { wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, wsMovimientos, '📋 Detalle Movimientos');
  
  // ============================================
  // HOJA 8: KARDEX POR VARIEDAD (ENTRADAS/SALIDAS)
  // ============================================
  const kardex = productosActivos.map(p => {
    const movs = movimientos.filter(m => m.producto === p.nombre);
    const ent = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + parseFloat(m.cantidad), 0);
    const sal = movs.filter(m => m.tipo === 'salida').reduce((s, m) => s + parseFloat(m.cantidad), 0);
    const adj = movs.filter(m => m.tipo === 'ajuste').reduce((s, m) => s + parseFloat(m.cantidad), 0);
    const ventasVar = ventas.filter(v => v.clase === p.nombre);
    const kilosVendidos = ventasVar.reduce((s, v) => s + parseFloat(v.kilos), 0);
    const bolsasVendidas = ventasVar.reduce((s, v) => s + v.bolsas, 0);
    const importeVar = ventasVar.reduce((s, v) => s + parseFloat(v.total), 0);
    
    return {
      Variedad: p.nombre,
      Código: p.codigo || '—',
      'Stock Actual': p.stock_actual,
      'Stock Mínimo': p.stock_minimo,
      'Entradas (movs)': ent.toFixed(3),
      'Salidas (movs)': sal.toFixed(3),
      'Ajustes': adj.toFixed(3),
      'Balance Movimientos': (ent - sal + adj).toFixed(3),
      'Kilos Vendidos (ventas)': kilosVendidos.toFixed(3),
      'Bolsas Vendidas': bolsasVendidas,
      'Importe Ventas': importeVar.toFixed(2),
      'Diferencia (Stock vs Calc)': (p.stock_actual - (ent - sal + adj - kilosVendidos)).toFixed(3),
    };
  });
  const wsKardex = XLSX.utils.json_to_sheet(kardex);
  wsKardex['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, wsKardex, '📈 Kardex por Variedad');
  
  // ============================================
  // HOJA 9: CRUCE VENTAS vs INVENTARIO
  // ============================================
  const cruce = productosActivos.map(p => {
    const ventasVar = ventas.filter(v => v.clase === p.nombre);
    const movs = movimientos.filter(m => m.producto === p.nombre);
    const ent = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + parseFloat(m.cantidad), 0);
    const sal = movs.filter(m => m.tipo === 'salida').reduce((s, m) => s + parseFloat(m.cantidad), 0);
    const kilosVendidos = ventasVar.reduce((s, v) => s + parseFloat(v.kilos), 0);
    const stockEsperado = p.stock_actual + kilosVendidos; // stock actual + lo que se vendió hoy
    
    return {
      Variedad: p.nombre,
      Código: p.codigo || '—',
      'Stock Actual': p.stock_actual,
      'Stock Mínimo': p.stock_minimo,
      'Kilos Vendidos Hoy': kilosVendidos.toFixed(3),
      'Ventas (registros)': ventasVar.length,
      'Importe Ventas': ventasVar.reduce((s, v) => s + parseFloat(v.total), 0).toFixed(2),
      'Entradas (movs)': ent.toFixed(3),
      'Salidas (movs)': sal.toFixed(3),
      'Stock Estimado Inicio Día': stockEsperado.toFixed(3),
      'Estado': p.requiere_reposicion ? '⚠️ REPONER' : kilosVendidos > 0 ? '✅ VENDIDO' : '📦 SIN MOVIMIENTO',
    };
  });
  const wsCruce = XLSX.utils.json_to_sheet(cruce);
  wsCruce['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, wsCruce, '🔄 Cruce Ventas-Inventario');
  
  const outputFormat = format === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(workbook, `${filename}.${outputFormat}`);
}