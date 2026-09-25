import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiErrorMessage } from '../../services/api';
import { inventarioService } from '../../services/inventario.service';
import type { MovimientoInventario, ProductoInventario, Proveedor, ReservaStock } from '../../types';
import { fechaHoy, formatoNumero } from '../../utils/format';
import { exportInventarioToExcel, exportMovimientosToExcel, importFromExcel, parseInventarioRow, parseMovimientoRow, ExportFormat } from '../../utils/excel';
import { useRealtimeSocket } from '../../hooks/useRealtimeSocket';

type ItemRecepcion = { productoId: string; cantidad: string; costo: string };

const ITEM_VACIO: ItemRecepcion = { productoId: '', cantidad: '', costo: '' };
const ITEMS_POR_PAGINA = 15;

const ESTADOS_PRODUCTO = [
  { value: 'disponible', label: '✅ Disponible', color: 'var(--color-success)' },
  { value: 'cuarentena', label: '🟡 Cuarentena', color: '#f59e0b' },
  { value: 'bloqueado', label: '🔴 Bloqueado', color: 'var(--color-danger)' },
  { value: 'reservado', label: '🔵 Reservado', color: '#3b82f6' },
  { value: 'en_transito', label: '🚚 En tránsito', color: '#8b5cf6' },
  { value: 'merma', label: '🗑️ Merma', color: '#6b7280' },
  { value: 'devuelto', label: '↩️ Devuelto', color: '#ec4899' },
] as const;

export function InventarioPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [reservas, setReservas] = useState<ReservaStock[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [producto, setProducto] = useState({ 
    nombre: '', 
    codigo: '',
    numeroLote: '',
    fechaCosecha: '',
    fechaCaducidad: '',
    origen: '',
    unidadMedida: 'kg', 
    stockMinimo: '0',
    estado: 'disponible'
  });
  const [movimiento, setMovimiento] = useState({ productoId: '', tipo: 'salida', cantidad: '', motivo: '', referencia: '' });
  const [recepcion, setRecepcion] = useState({ proveedorId: '', referencia: '', fecha: fechaHoy(), notas: '', items: [{ ...ITEM_VACIO }] });
  const [reserva, setReserva] = useState({ productoId: '', cantidad: '', origenTipo: 'manual', origenId: '', referencia: '', notas: '', fechaVencimiento: '' });
  
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroMovimientoFecha, setFiltroMovimientoFecha] = useState({ desde: '', hasta: '' });
  const [paginaProductos, setPaginaProductos] = useState(1);
  const [paginaMovimientos, setPaginaMovimientos] = useState(1);
  const [editandoStockMinimo, setEditandoStockMinimo] = useState<number | null>(null);
  const [nuevoStockMinimo, setNuevoStockMinimo] = useState('');
  const [mostrarReservas, setMostrarReservas] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaProductos, listaMovimientos, listaProveedores, listaReservas] = await Promise.all([
        inventarioService.productos(), 
        inventarioService.movimientos(),
        inventarioService.getProveedores(),
        inventarioService.listarReservas()
      ]);
      setProductos(listaProductos);
      setMovimientos(listaMovimientos);
      setProveedores(listaProveedores);
      setReservas(listaReservas);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, []);

  // Escuchar actualizaciones de inventario en tiempo real
  useRealtimeSocket({
    onInventario: (event) => {
      setProductos(event.productos);
      // Recargar movimientos para que se vean los nuevos
      inventarioService.movimientos().then(setMovimientos);
    },
  });

  useEffect(() => { void cargar(); }, [cargar]);

  const resumen = useMemo(() => ({
    productos: productos.filter((p) => p.activo).length,
    bajoMinimo: productos.filter((p) => p.activo && p.requiere_reposicion).length,
    unidades: productos.reduce((total, p) => total + p.stock_disponible, 0),
    valorTotal: productos.reduce((total, p) => total + p.valor_stock, 0),
    enCuarentena: productos.filter((p) => p.estado === 'cuarentena').length,
    enTransito: productos.filter((p) => p.estado === 'en_transito').length,
  }), [productos]);

  const productosFiltrados = useMemo(() => 
    productos.filter(p => 
      p.nombre.toLowerCase().includes(filtroProducto.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(filtroProducto.toLowerCase())) ||
      (p.numero_lote && p.numero_lote.toLowerCase().includes(filtroProducto.toLowerCase()))
    ), 
  [productos, filtroProducto]);

  const movimientosFiltrados = useMemo(() => 
    movimientos.filter(m => {
      const fecha = new Date(m.creado_at);
      const desde = filtroMovimientoFecha.desde ? new Date(filtroMovimientoFecha.desde) : null;
      const hasta = filtroMovimientoFecha.hasta ? new Date(filtroMovimientoFecha.hasta + 'T23:59:59') : null;
      return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
    }),
  [movimientos, filtroMovimientoFecha]);

  const productosPaginados = useMemo(() => 
    productosFiltrados.slice((paginaProductos - 1) * ITEMS_POR_PAGINA, paginaProductos * ITEMS_POR_PAGINA),
  [productosFiltrados, paginaProductos]);

  const totalPaginasProductos = Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA);
  const totalPaginasMovimientos = Math.ceil(movimientosFiltrados.length / ITEMS_POR_PAGINA);

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setError(''); setGuardando(true);
    try { await accion(); await cargar(); return true; }
    catch (err) { setError(apiErrorMessage(err)); return false; }
    finally { setGuardando(false); }
  };

  const guardarProducto = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await ejecutar(() => inventarioService.crearProducto({
      nombre: producto.nombre,
      codigo: producto.codigo || undefined,
      numeroLote: producto.numeroLote || undefined,
      fechaCosecha: producto.fechaCosecha || undefined,
      fechaCaducidad: producto.fechaCaducidad || undefined,
      origen: producto.origen || undefined,
      unidadMedida: producto.unidadMedida,
      stockMinimo: Number(producto.stockMinimo),
      estado: producto.estado,
    }));
    if (ok) setProducto({ nombre: '', codigo: '', numeroLote: '', fechaCosecha: '', fechaCaducidad: '', origen: '', unidadMedida: 'kg', stockMinimo: '0', estado: 'disponible' });
  };

  const guardarMovimiento = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await ejecutar(() => inventarioService.movimiento({
      productoId: Number(movimiento.productoId), tipo: movimiento.tipo, cantidad: Number(movimiento.cantidad),
      motivo: movimiento.motivo || undefined, referencia: movimiento.referencia || undefined,
    }));
    if (ok) setMovimiento({ productoId: '', tipo: 'salida', cantidad: '', motivo: '', referencia: '' });
  };

  const cambiarItem = (indice: number, campo: keyof ItemRecepcion, valor: string) => {
    setRecepcion((actual) => ({ ...actual, items: actual.items.map((item, i) => i === indice ? { ...item, [campo]: valor } : item) }));
  };

  const guardarRecepcion = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await ejecutar(() => inventarioService.recepcion({
      proveedorId: recepcion.proveedorId ? Number(recepcion.proveedorId) : undefined, 
      referencia: recepcion.referencia || undefined,
      fecha: recepcion.fecha, 
      notas: recepcion.notas || undefined,
      items: recepcion.items.map((item) => ({ 
        productoId: Number(item.productoId), 
        cantidad: Number(item.cantidad),
        costo: item.costo ? Number(item.costo) : undefined
      })),
    }));
    if (ok) setRecepcion({ proveedorId: '', referencia: '', fecha: fechaHoy(), notas: '', items: [{ ...ITEM_VACIO }] });
  };

  const crearReserva = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await ejecutar(() => inventarioService.crearReserva({
      productoId: Number(reserva.productoId),
      cantidad: Number(reserva.cantidad),
      origenTipo: reserva.origenTipo as any,
      origenId: reserva.origenId ? Number(reserva.origenId) : undefined,
      referencia: reserva.referencia || undefined,
      notas: reserva.notas || undefined,
      fechaVencimiento: reserva.fechaVencimiento || undefined,
    }));
    if (ok) setReserva({ productoId: '', cantidad: '', origenTipo: 'manual', origenId: '', referencia: '', notas: '', fechaVencimiento: '' });
  };

  const confirmarReserva = async (id: number) => {
    await ejecutar(() => inventarioService.confirmarReserva(id));
  };

  const liberarReserva = async (id: number) => {
    await ejecutar(() => inventarioService.liberarReserva(id));
  };

  const reponerProducto = async (productoId: number) => {
    const prod = productos.find(p => p.id === productoId);
    if (!prod) return;
    
    const cantidad = window.prompt(`Cantidad a reponer para "${prod.nombre}" (disponible: ${formatoNumero(prod.stock_disponible, 3)} ${prod.unidad_medida}):`);
    if (!cantidad) return;
    
    const cant = Number(cantidad);
    if (isNaN(cant) || cant <= 0) return;
    
    await ejecutar(() => inventarioService.movimiento({
      productoId: prod.id, tipo: 'entrada', cantidad: cant,
      motivo: 'Reposición de inventario', referencia: undefined,
    }));
  };

  const toggleActivo = async (producto: ProductoInventario) => {
    await ejecutar(() => inventarioService.actualizarProducto(producto.id, { activo: !producto.activo }));
  };

  const cambiarEstado = async (producto: ProductoInventario, nuevoEstado: string) => {
    await ejecutar(() => inventarioService.actualizarProducto(producto.id, { estado: nuevoEstado }));
  };

  const iniciarEdicionStockMinimo = (producto: ProductoInventario) => {
    setEditandoStockMinimo(producto.id);
    setNuevoStockMinimo(producto.stock_minimo.toString());
  };

  const guardarStockMinimo = async (productoId: number) => {
    const stock = Number(nuevoStockMinimo);
    if (isNaN(stock) || stock < 0) return;
    
    await ejecutar(() => inventarioService.actualizarProducto(productoId, { stockMinimo: stock }));
    setEditandoStockMinimo(null);
    setNuevoStockMinimo('');
  };

  const handleExportInventario = (format: ExportFormat) => {
    if (productos.length === 0) { alert('No hay datos para exportar'); return; }
    exportInventarioToExcel(productos, `inventario-${fechaHoy()}`, format);
  };

  const handleExportMovimientos = (format: ExportFormat) => {
    if (movimientos.length === 0) { alert('No hay datos para exportar'); return; }
    exportMovimientosToExcel(movimientos, `movimientos-inventario-${fechaHoy()}`, format);
  };

  const handleImportInventario = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { data, errors } = await importFromExcel(file, (row) => parseInventarioRow(row));
      
      if (errors.length > 0) {
        alert(`Se encontraron ${errors.length} errores:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
      }
      
      if (data.length > 0) {
        for (const item of data) {
          await inventarioService.crearProducto(item);
        }
        await cargar();
      }
      
      if (event.target) event.target.value = '';
    } catch (error) {
      alert(`Error al importar: ${error instanceof Error ? error.message : 'Desconocido'}`);
    }
  };

  const handleImportMovimientos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { data, errors } = await importFromExcel(file, (row) => parseMovimientoRow(row, productos));
      
      if (errors.length > 0) {
        alert(`Se encontraron ${errors.length} errores:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
      }
      
      if (data.length > 0) {
        for (const item of data) {
          await inventarioService.movimiento(item);
        }
        await cargar();
      }
      
      if (event.target) event.target.value = '';
    } catch (error) {
      alert(`Error al importar: ${error instanceof Error ? error.message : 'Desconocido'}`);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const config = ESTADOS_PRODUCTO.find(e => e.value === estado);
    return config ? <span className="badge" style={{ backgroundColor: config.color, color: 'white' }}>{config.label}</span> : <span className="badge">{estado}</span>;
  };

  const getStockClass = (p: ProductoInventario) => {
    if (!p.activo) return 'text-muted';
    if (p.stock_disponible <= 0) return 'text-danger font-bold';
    if (p.requiere_reposicion) return 'text-warning font-bold';
    return 'text-success';
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Control de existencias</span>
          <h2>Inventario</h2>
          <p>Las ventas descuentan existencias automáticamente. Aquí registras cargas, ajustes y el kardex.</p>
        </div>
      </div>

      {error && <div className="panel error-msg">{error}</div>}

      <section className="kpis">
        <article className="kpi"><div className="etiqueta">Variedades / lotes activos</div><div className="valor">{resumen.productos}</div></article>
        <article className="kpi alerta-kpi"><div className="etiqueta">Requieren reposición</div><div className="valor">{resumen.bajoMinimo}</div></article>
        <article className="kpi"><div className="etiqueta">Unidades registradas</div><div className="valor">{formatoNumero(resumen.unidades, 0)}</div></article>
      </section>

      <div className="inventario-columnas">
        <section className="panel">
          <div className="section-heading">
            <div><h2>Nueva variedad o lote</h2><p>Ejemplo: papa blanca, papa roja o un lote identificado.</p></div>
          </div>
          <form className="formulario" onSubmit={guardarProducto}>
            <label>Variedad o lote<input required placeholder="Ej. Papa blanca" value={producto.nombre} onChange={(e) => setProducto({ ...producto, nombre: e.target.value })} /></label>
            <label>Código / SKU<input placeholder="Ej. PAPA-BLANCA-001" value={producto.codigo} onChange={(e) => setProducto({ ...producto, codigo: e.target.value })} /></label>
            <label>Número de lote<input placeholder="Ej. LOTE-2024-001" value={producto.numeroLote} onChange={(e) => setProducto({ ...producto, numeroLote: e.target.value })} /></label>
            <label>Fecha de cosecha<input type="date" value={producto.fechaCosecha} onChange={(e) => setProducto({ ...producto, fechaCosecha: e.target.value })} /></label>
            <label>Fecha de caducidad<input type="date" value={producto.fechaCaducidad} onChange={(e) => setProducto({ ...producto, fechaCaducidad: e.target.value })} /></label>
            <label>Origen<input placeholder="Ej. Campo Norte, Galpón 3" value={producto.origen} onChange={(e) => setProducto({ ...producto, origen: e.target.value })} /></label>
            <label>Estado inicial<select value={producto.estado} onChange={(e) => setProducto({ ...producto, estado: e.target.value })}>{ESTADOS_PRODUCTO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}</select></label>
            <label>Unidad<select value={producto.unidadMedida} onChange={(e) => setProducto({ ...producto, unidadMedida: e.target.value })}><option value="kg">Kilogramo</option><option value="costal">Costal</option><option value="caja">Caja</option></select></label>
            <label>Mínimo para reponer<input required min="0" step="0.001" type="number" value={producto.stockMinimo} onChange={(e) => setProducto({ ...producto, stockMinimo: e.target.value })} /></label>
            <button disabled={guardando}>Agregar variedad</button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading"><div><h2>Movimiento individual</h2><p>Registra salida, entrada aislada o corrección de papa.</p></div></div>
          <form className="formulario" onSubmit={guardarMovimiento}>
            <label>Variedad o lote<select required value={movimiento.productoId} onChange={(e) => setMovimiento({ ...movimiento, productoId: e.target.value })}><option value="">Selecciona una variedad</option>{productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} — {formatoNumero(p.stock_actual, 3)} {p.unidad_medida}</option>)}</select></label>
            <label>Tipo<select value={movimiento.tipo} onChange={(e) => setMovimiento({ ...movimiento, tipo: e.target.value })}><option value="salida">Salida de papa</option><option value="entrada">Entrada individual</option><option value="ajuste">Ajuste (+ o -)</option></select></label>
            <label>Cantidad<input required type="number" step="0.001" min={movimiento.tipo === 'ajuste' ? undefined : '0.001'} value={movimiento.cantidad} onChange={(e) => setMovimiento({ ...movimiento, cantidad: e.target.value })} /></label>
            <label>Motivo<input value={movimiento.motivo} onChange={(e) => setMovimiento({ ...movimiento, motivo: e.target.value })} placeholder="Ej. consumo en bodega" /></label>
            <button disabled={guardando}>Registrar movimiento</button>
          </form>
        </section>
      </div>

      <section className="panel recepcion-panel">
        <div className="section-heading"><div><h2>Registrar carga de papa</h2><p>Una carga puede incluir varias variedades o lotes y se guarda como una sola operación. Incluya costo unitario para cálculo de costo promedio (WAC).</p></div><span className="counter">{recepcion.items.length} {recepcion.items.length === 1 ? 'variedad' : 'variedades'}</span></div>
        <form onSubmit={guardarRecepcion}>
          <div className="formulario formulario-horizontal">
            <label>Proveedor<select value={recepcion.proveedorId} onChange={(e) => setRecepcion({ ...recepcion, proveedorId: e.target.value })}><option value="">Selecciona un proveedor</option>{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
            <label>Referencia / folio<input value={recepcion.referencia} onChange={(e) => setRecepcion({ ...recepcion, referencia: e.target.value })} /></label>
            <label>Fecha<input required type="date" value={recepcion.fecha} onChange={(e) => setRecepcion({ ...recepcion, fecha: e.target.value })} /></label>
          </div>
          <div className="lineas-recepcion">{recepcion.items.map((item, indice) => <div className="linea-recepcion" key={indice}><select required value={item.productoId} onChange={(e) => cambiarItem(indice, 'productoId', e.target.value)}><option value="">Variedad o lote</option>{productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad_medida})</option>)}</select><input required type="number" min="0.001" step="0.001" value={item.cantidad} placeholder="Kilos o cantidad" onChange={(e) => cambiarItem(indice, 'cantidad', e.target.value)} /><input type="number" step="0.01" min="0" value={item.costo} placeholder="Costo unitario" onChange={(e) => cambiarItem(indice, 'costo', e.target.value)} />{recepcion.items.length > 1 && <button className="secundario" type="button" onClick={() => setRecepcion({ ...recepcion, items: recepcion.items.filter((_, i) => i !== indice) })}>Quitar</button>}</div>)}</div>
          <div className="acciones-grid"><button className="secundario" type="button" onClick={() => setRecepcion({ ...recepcion, items: [...recepcion.items, { ...ITEM_VACIO }] })}>+ Agregar línea</button><button disabled={guardando}>Guardar carga</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div><h2>Existencias y planificación</h2><p>Las variedades marcadas requieren una nueva compra o carga.</p></div>
          <div className="toolbar-group">
            <input 
              type="text" 
              placeholder="Buscar variedad o código..." 
              value={filtroProducto} 
              onChange={(e) => { setFiltroProducto(e.target.value); setPaginaProductos(1); }}
              style={{ width: '250px', padding: '6px 10px', fontSize: '13px' }}
            />
            <label className="toolbar-label">Exportar:</label>
            <button className="secundario" onClick={() => handleExportInventario('xlsx')} disabled={productos.length === 0}>Excel</button>
            <button className="secundario" onClick={() => handleExportInventario('csv')} disabled={productos.length === 0}>CSV</button>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              id="import-inventario"
              onChange={handleImportInventario}
            />
            <label htmlFor="import-inventario" className="secundario" style={{ cursor: 'pointer' }}>Importar</label>
          </div>
        </div>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Variedad / lote</th>
                <th>Lote</th>
                <th>Caducidad</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Real</th>
                <th>Reservado</th>
                <th>Disponible</th>
                <th>Mínimo</th>
                <th>Costo Prom.</th>
                <th>Valor Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosPaginados.map((p) => (
                <tr key={p.id} className={p.requiere_reposicion && p.activo ? 'fila-alerta' : ''}>
                  <td>{p.nombre}</td>
                  <td>{p.numero_lote || '—'}</td>
                  <td>{p.fecha_caducidad ? new Date(p.fecha_caducidad).toLocaleDateString('es-MX') : '—'}</td>
                  <td>{p.origen || '—'}</td>
                  <td>{getEstadoBadge(p.estado)}</td>
                  <td className={getStockClass(p)}>{formatoNumero(p.stock_real, 3)} {p.unidad_medida}</td>
                  <td className="text-muted">{formatoNumero(p.stock_reservado, 3)} {p.unidad_medida}</td>
                  <td className={getStockClass(p)}><strong>{formatoNumero(p.stock_disponible, 3)}</strong> {p.unidad_medida}</td>
                  <td>
                    {editandoStockMinimo === p.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          step="0.001" 
                          min="0" 
                          value={nuevoStockMinimo} 
                          onChange={(e) => setNuevoStockMinimo(e.target.value)}
                          style={{ width: '80px', padding: '4px 8px' }}
                          onKeyDown={(e) => e.key === 'Enter' && guardarStockMinimo(p.id)}
                          onBlur={() => guardarStockMinimo(p.id)}
                          autoFocus
                        />
                        <button className="secundario" onClick={() => guardarStockMinimo(p.id)} style={{ padding: '2px 8px', fontSize: '11px' }}>Guardar</button>
                        <button className="secundario" onClick={() => { setEditandoStockMinimo(null); setNuevoStockMinimo(''); }} style={{ padding: '2px 8px', fontSize: '11px' }}>Cancelar</button>
                      </div>
                    ) : (
                      <span onClick={() => iniciarEdicionStockMinimo(p)} style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--color-primary)' }}>
                        {formatoNumero(p.stock_minimo, 3)}
                      </span>
                    )}
                  </td>
                  <td className="text-muted">${formatoNumero(p.costo_promedio, 2)}</td>
                  <td className="text-muted">${formatoNumero(p.valor_stock, 2)}</td>
                  <td style={{ whiteSpace: 'nowrap', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {p.activo && p.requiere_reposicion && (
                      <button className="secundario" onClick={() => reponerProducto(p.id)} style={{ padding: '4px 10px', fontSize: '12px' }}>Reponer</button>
                    )}
                    <button className="secundario" onClick={() => toggleActivo(p)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <select 
                      value={p.estado} 
                      onChange={(e) => cambiarEstado(p, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '12px', minWidth: '130px' }}
                      disabled={!p.activo}
                    >
                      {ESTADOS_PRODUCTO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                    {editandoStockMinimo !== p.id && (
                      <button className="secundario" onClick={() => iniciarEdicionStockMinimo(p)} style={{ padding: '4px 10px', fontSize: '12px' }}>Editar mín.</button>
                    )}
                  </td>
                </tr>
              ))}
              {!cargando && productosFiltrados.length === 0 && <tr><td colSpan={12} className="vacio">Aún no hay variedades o lotes registrados.</td></tr>}
              {productosFiltrados.length > ITEMS_POR_PAGINA && (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <button className="secundario" onClick={() => setPaginaProductos(p => Math.max(1, p - 1))} disabled={paginaProductos === 1}>Anterior</button>
                      <span>Página {paginaProductos} de {totalPaginasProductos} ({productosFiltrados.length} resultados)</span>
                      <button className="secundario" onClick={() => setPaginaProductos(p => Math.min(totalPaginasProductos, p + 1))} disabled={paginaProductos === totalPaginasProductos}>Siguiente</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* RESERVAS */}
      <section className="panel">
        <div className="section-heading">
          <div><h2>Reservas de stock</h2><p>Stock comprometido para ventas, transferencias, producción. Se descuenta del disponible.</p></div>
          <button className="secundario" onClick={() => setMostrarReservas(!mostrarReservas)}>
            {mostrarReservas ? 'Ocultar' : 'Mostrar'} formulario
          </button>
        </div>
        
        {mostrarReservas && (
          <form className="formulario" onSubmit={crearReserva} style={{ marginBottom: '16px' }}>
            <label>Variedad<select required value={reserva.productoId} onChange={(e) => setReserva({ ...reserva, productoId: e.target.value })}><option value="">Selecciona</option>{productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} (Disp: {formatoNumero(p.stock_disponible, 3)} {p.unidad_medida})</option>)}</select></label>
            <label>Cantidad<input required type="number" step="0.001" min="0.001" value={reserva.cantidad} onChange={(e) => setReserva({ ...reserva, cantidad: e.target.value })} /></label>
            <label>Origen<select value={reserva.origenTipo} onChange={(e) => setReserva({ ...reserva, origenTipo: e.target.value })}><option value="venta">Venta</option><option value="transferencia">Transferencia</option><option value="produccion">Producción</option><option value="ajuste">Ajuste</option><option value="manual">Manual</option></select></label>
            <label>ID Origen<input value={reserva.origenId} onChange={(e) => setReserva({ ...reserva, origenId: e.target.value })} placeholder="Ej. 123 (ID de venta/transferencia)" type="number" min="1" /></label>
            <label>Referencia<input value={reserva.referencia} onChange={(e) => setReserva({ ...reserva, referencia: e.target.value })} placeholder="Ej. Venta #123" /></label>
            <label>Notas<input value={reserva.notas} onChange={(e) => setReserva({ ...reserva, notas: e.target.value })} placeholder="Observaciones" /></label>
            <label>Vence<input type="datetime-local" value={reserva.fechaVencimiento} onChange={(e) => setReserva({ ...reserva, fechaVencimiento: e.target.value })} /></label>
            <button disabled={guardando} type="submit">Crear reserva</button>
          </form>
        )}

        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Variedad</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Referencia</th>
                <th>Creado</th>
                <th>Vence</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservas.length === 0 ? (
                <tr><td colSpan={9} className="vacio">No hay reservas registradas</td></tr>
              ) : (
                reservas.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{r.producto || `Prod ${r.producto_id}`}</td>
                    <td>{formatoNumero(Number(r.cantidad), 3)} {r.unidad_medida || ''}</td>
                    <td><span className={`badge reserva-${r.estado}`}>{r.estado}</span></td>
                    <td>{r.origen_tipo}</td>
                    <td>{r.referencia || '—'}</td>
                    <td>{new Date(r.creado_at).toLocaleString('es-MX')}</td>
                    <td>{r.fecha_vencimiento ? new Date(r.fecha_vencimiento).toLocaleString('es-MX') : '—'}</td>
                    <td style={{ display: 'flex', gap: '4px' }}>
                      {r.estado === 'activa' && (
                        <>
                          <button className="secundario" onClick={() => confirmarReserva(r.id)} style={{ padding: '2px 8px', fontSize: '11px' }}>Confirmar</button>
                          <button className="secundario" onClick={() => liberarReserva(r.id)} style={{ padding: '2px 8px', fontSize: '11px' }}>Liberar</button>
                        </>
                      )}
                      {r.estado === 'confirmada' && (
                        <button className="secundario" onClick={() => liberarReserva(r.id)} style={{ padding: '2px 8px', fontSize: '11px' }}>Liberar</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div><h2>Últimos movimientos</h2><p>Historial reciente de entradas, salidas y ajustes de papa.</p></div>
          <div className="toolbar-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="toolbar-label">Desde:</span>
              <input type="date" value={filtroMovimientoFecha.desde} onChange={(e) => setFiltroMovimientoFecha({ ...filtroMovimientoFecha, desde: e.target.value })} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="toolbar-label">Hasta:</span>
              <input type="date" value={filtroMovimientoFecha.hasta} onChange={(e) => setFiltroMovimientoFecha({ ...filtroMovimientoFecha, hasta: e.target.value })} />
            </label>
            <label className="toolbar-label">Exportar:</label>
            <button className="secundario" onClick={() => handleExportMovimientos('xlsx')} disabled={movimientos.length === 0}>Excel</button>
            <button className="secundario" onClick={() => handleExportMovimientos('csv')} disabled={movimientos.length === 0}>CSV</button>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              id="import-movimientos"
              onChange={handleImportMovimientos}
            />
            <label htmlFor="import-movimientos" className="secundario" style={{ cursor: 'pointer' }}>Importar</label>
          </div>
        </div>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Variedad / lote</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.slice((paginaMovimientos - 1) * ITEMS_POR_PAGINA, paginaMovimientos * ITEMS_POR_PAGINA).map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.creado_at).toLocaleString('es-MX')}</td>
                  <td>{m.producto}</td>
                  <td><span className={`badge movimiento-${m.tipo}`}>{m.tipo}</span></td>
                  <td>{m.tipo === 'salida' ? '-' : ''}{formatoNumero(Number(m.cantidad), 3)} {m.unidad_medida}</td>
                  <td>{m.motivo ?? '—'}</td>
                  <td>{m.usuario}</td>
                </tr>
              ))}
              {!cargando && movimientosFiltrados.length === 0 && <tr><td colSpan={6} className="vacio">Todavía no hay movimientos de inventario.</td></tr>}
              {movimientosFiltrados.length > ITEMS_POR_PAGINA && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <button className="secundario" onClick={() => setPaginaMovimientos(p => Math.max(1, p - 1))} disabled={paginaMovimientos === 1}>Anterior</button>
                      <span>Página {paginaMovimientos} de {totalPaginasMovimientos} ({movimientosFiltrados.length} resultados)</span>
                      <button className="secundario" onClick={() => setPaginaMovimientos(p => Math.min(totalPaginasMovimientos, p + 1))} disabled={paginaMovimientos === totalPaginasMovimientos}>Siguiente</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}