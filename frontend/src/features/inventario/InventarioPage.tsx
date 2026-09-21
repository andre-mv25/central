import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiErrorMessage } from '../../services/api';
import { inventarioService } from '../../services/inventario.service';
import type { MovimientoInventario, ProductoInventario } from '../../types';
import { fechaHoy, formatoNumero } from '../../utils/format';

type ItemRecepcion = { productoId: string; cantidad: string };

const ITEM_VACIO: ItemRecepcion = { productoId: '', cantidad: '' };

export function InventarioPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [producto, setProducto] = useState({ nombre: '', codigo: '', unidadMedida: 'kg', stockMinimo: '0' });
  const [movimiento, setMovimiento] = useState({ productoId: '', tipo: 'salida', cantidad: '', motivo: '', referencia: '' });
  const [recepcion, setRecepcion] = useState({ proveedor: '', referencia: '', fecha: fechaHoy(), notas: '', items: [{ ...ITEM_VACIO }] });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [listaProductos, listaMovimientos] = await Promise.all([inventarioService.productos(), inventarioService.movimientos()]);
      setProductos(listaProductos);
      setMovimientos(listaMovimientos);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const resumen = useMemo(() => ({
    productos: productos.filter((p) => p.activo).length,
    bajoMinimo: productos.filter((p) => p.activo && p.requiere_reposicion).length,
    unidades: productos.reduce((total, p) => total + p.stock_actual, 0),
  }), [productos]);

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setError(''); setGuardando(true);
    try { await accion(); await cargar(); return true; }
    catch (err) { setError(apiErrorMessage(err)); return false; }
    finally { setGuardando(false); }
  };

  const guardarProducto = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await ejecutar(() => inventarioService.crearProducto({
      nombre: producto.nombre, codigo: producto.codigo || undefined, unidadMedida: producto.unidadMedida,
      stockMinimo: Number(producto.stockMinimo),
    }));
    if (ok) setProducto({ nombre: '', codigo: '', unidadMedida: 'kg', stockMinimo: '0' });
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
      proveedor: recepcion.proveedor || undefined, referencia: recepcion.referencia || undefined,
      fecha: recepcion.fecha, notas: recepcion.notas || undefined,
      items: recepcion.items.map((item) => ({ productoId: Number(item.productoId), cantidad: Number(item.cantidad) })),
    }));
    if (ok) setRecepcion({ proveedor: '', referencia: '', fecha: fechaHoy(), notas: '', items: [{ ...ITEM_VACIO }] });
  };

  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">Control de existencias</span><h2>Inventario</h2><p>Controla kilos, cargas y necesidades de reposición por variedad o lote.</p></div></div>
      {error && <div className="panel error-msg">{error}</div>}
      <section className="kpis">
        <article className="kpi"><div className="etiqueta">Variedades / lotes activos</div><div className="valor">{resumen.productos}</div></article>
        <article className="kpi alerta-kpi"><div className="etiqueta">Requieren reposición</div><div className="valor">{resumen.bajoMinimo}</div></article>
        <article className="kpi"><div className="etiqueta">Kilos registrados</div><div className="valor">{formatoNumero(resumen.unidades, 0)}</div></article>
      </section>
      <div className="inventario-columnas">
        <section className="panel"><div className="section-heading"><div><h2>Nueva variedad o lote</h2><p>Ejemplo: papa blanca, papa roja o un lote identificado.</p></div></div>
          <form className="formulario" onSubmit={guardarProducto}>
            <label>Variedad o lote<input required placeholder="Ej. Papa blanca" value={producto.nombre} onChange={(e) => setProducto({ ...producto, nombre: e.target.value })} /></label>
            <label>Código de lote<input placeholder="Opcional" value={producto.codigo} onChange={(e) => setProducto({ ...producto, codigo: e.target.value })} /></label>
            <label>Unidad<select value={producto.unidadMedida} onChange={(e) => setProducto({ ...producto, unidadMedida: e.target.value })}><option value="kg">Kilogramo</option><option value="costal">Costal</option><option value="caja">Caja</option></select></label>
            <label>Mínimo para reponer<input required min="0" step="0.001" type="number" value={producto.stockMinimo} onChange={(e) => setProducto({ ...producto, stockMinimo: e.target.value })} /></label>
            <button disabled={guardando}>Agregar variedad</button>
          </form>
        </section>
        <section className="panel"><div className="section-heading"><div><h2>Movimiento individual</h2><p>Registra salida, entrada aislada o corrección de papa.</p></div></div>
          <form className="formulario" onSubmit={guardarMovimiento}>
            <label>Variedad o lote<select required value={movimiento.productoId} onChange={(e) => setMovimiento({ ...movimiento, productoId: e.target.value })}><option value="">Selecciona una variedad</option>{productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} — {formatoNumero(p.stock_actual, 3)} {p.unidad_medida}</option>)}</select></label>
            <label>Tipo<select value={movimiento.tipo} onChange={(e) => setMovimiento({ ...movimiento, tipo: e.target.value })}><option value="salida">Salida de papa</option><option value="entrada">Entrada individual</option><option value="ajuste">Ajuste (+ o -)</option></select></label>
            <label>Cantidad<input required type="number" step="0.001" min={movimiento.tipo === 'ajuste' ? undefined : '0.001'} value={movimiento.cantidad} onChange={(e) => setMovimiento({ ...movimiento, cantidad: e.target.value })} /></label>
            <label>Motivo<input value={movimiento.motivo} onChange={(e) => setMovimiento({ ...movimiento, motivo: e.target.value })} placeholder="Ej. consumo en bodega" /></label>
            <button disabled={guardando}>Registrar movimiento</button>
          </form>
        </section>
      </div>
      <section className="panel recepcion-panel"><div className="section-heading"><div><h2>Registrar carga de papa</h2><p>Una carga puede incluir varias variedades o lotes y se guarda como una sola operación.</p></div><span className="counter">{recepcion.items.length} {recepcion.items.length === 1 ? 'variedad' : 'variedades'}</span></div>
        <form onSubmit={guardarRecepcion}>
          <div className="formulario formulario-horizontal"><label>Proveedor<input value={recepcion.proveedor} onChange={(e) => setRecepcion({ ...recepcion, proveedor: e.target.value })} /></label><label>Referencia / folio<input value={recepcion.referencia} onChange={(e) => setRecepcion({ ...recepcion, referencia: e.target.value })} /></label><label>Fecha<input required type="date" value={recepcion.fecha} onChange={(e) => setRecepcion({ ...recepcion, fecha: e.target.value })} /></label></div>
          <div className="lineas-recepcion">{recepcion.items.map((item, indice) => <div className="linea-recepcion" key={indice}><select required value={item.productoId} onChange={(e) => cambiarItem(indice, 'productoId', e.target.value)}><option value="">Variedad o lote</option>{productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad_medida})</option>)}</select><input required type="number" min="0.001" step="0.001" value={item.cantidad} placeholder="Kilos o cantidad recibida" onChange={(e) => cambiarItem(indice, 'cantidad', e.target.value)} />{recepcion.items.length > 1 && <button className="secundario" type="button" onClick={() => setRecepcion({ ...recepcion, items: recepcion.items.filter((_, i) => i !== indice) })}>Quitar</button>}</div>)}</div>
          <div className="acciones-grid"><button className="secundario" type="button" onClick={() => setRecepcion({ ...recepcion, items: [...recepcion.items, { ...ITEM_VACIO }] })}>+ Agregar línea</button><button disabled={guardando}>Guardar carga</button></div>
        </form>
      </section>
      <section className="panel"><div className="section-heading"><div><h2>Existencias y planificación</h2><p>Las variedades marcadas requieren una nueva compra o carga.</p></div></div><div className="tabla-scroll"><table><thead><tr><th>Variedad / lote</th><th>Código</th><th>Disponible</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody>{productos.map((p) => <tr key={p.id} className={p.requiere_reposicion && p.activo ? 'fila-alerta' : ''}><td>{p.nombre}</td><td>{p.codigo ?? '—'}</td><td>{formatoNumero(p.stock_actual, 3)} {p.unidad_medida}</td><td>{formatoNumero(p.stock_minimo, 3)}</td><td>{!p.activo ? <span className="badge">Inactivo</span> : p.requiere_reposicion ? <span className="badge alerta">Reponer</span> : <span className="badge correcto">Disponible</span>}</td></tr>)}{!cargando && productos.length === 0 && <tr><td colSpan={5} className="vacio">Aún no hay variedades o lotes registrados.</td></tr>}</tbody></table></div></section>
      <section className="panel"><div className="section-heading"><div><h2>Últimos movimientos</h2><p>Historial reciente de entradas, salidas y ajustes de papa.</p></div></div><div className="tabla-scroll"><table><thead><tr><th>Fecha</th><th>Variedad / lote</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>{movimientos.map((m) => <tr key={m.id}><td>{new Date(m.creado_at).toLocaleString('es-MX')}</td><td>{m.producto}</td><td><span className={`badge movimiento-${m.tipo}`}>{m.tipo}</span></td><td>{m.tipo === 'salida' ? '-' : ''}{formatoNumero(Number(m.cantidad), 3)} {m.unidad_medida}</td><td>{m.motivo ?? '—'}</td><td>{m.usuario}</td></tr>)}{!cargando && movimientos.length === 0 && <tr><td colSpan={6} className="vacio">Todavía no hay movimientos de inventario.</td></tr>}</tbody></table></div></section>
    </>
  );
}
