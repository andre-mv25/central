import { useEffect, useState } from 'react';
import { reportesService, type ResumenDiarioData } from '../../services/reportes.service';
import { fechaHoy, formatoNumero, formatoMoneda } from '../../utils/format';

interface ResumenDiarioProps {
  fecha?: string;
  sucursal?: string;
  onClose?: () => void;
}

export function ResumenDiario({ fecha = fechaHoy(), sucursal, onClose }: ResumenDiarioProps) {
  const [data, setData] = useState<ResumenDiarioData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const resumen = await reportesService.resumenDiario(fecha, sucursal);
        setData(resumen);
      } catch (err) {
        setError('No se pudo cargar el resumen');
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [fecha, sucursal]);

  const formatearToneladas = (kilos: number) => `${(kilos / 1000).toFixed(1)} ton`;

  if (cargando) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: 'var(--color-muted)' }}>Generando resumen ejecutivo...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="panel error-msg" style={{ textAlign: 'center' }}>
        {error || 'No hay datos para la fecha seleccionada'}
        <button className="secundario" onClick={() => window.location.reload()} style={{ marginTop: '12px' }}>
          Reintentar
        </button>
      </div>
    );
  }

  const { ventas, inventario, alertas, narrativa } = data;

  return (
    <div className="panel resumen-ejecutivo">
      <div className="section-heading" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2>📋 Resumen Ejecutivo</h2>
          <p>Fecha: {new Date(data.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {onClose && (
          <button className="secundario" onClick={onClose} style={{ height: 'fit-content' }}>
            ✕ Cerrar
          </button>
        )}
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '12px' }}>{error}</div>}

      {/* Narrativa principal - IA */}
      <div className="narrativa-principal" style={{
        background: '#f0f7ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#1e3a5f',
        fontStyle: 'italic',
      }}>
        {narrativa}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* KPIs Ventas */}
        <div className="kpi" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
          <div className="etiqueta" style={{ color: '#166534' }}>💰 Ventas del día</div>
          <div className="valor" style={{ color: '#166534', fontSize: '24px' }}>
            {formatearToneladas(ventas.totalKilos)} · {formatoMoneda(ventas.totalDinero)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            {ventas.totalRegistros} registros · Precio prom: {formatoMoneda(ventas.precioPromedio)}/kg
          </div>
        </div>

        {/* KPIs Inventario */}
        <div className="kpi" style={{ background: '#fef3c7', borderColor: '#fcd34d' }}>
          <div className="etiqueta" style={{ color: '#92400e' }}>📦 Inventario</div>
          <div className="valor" style={{ color: '#92400e', fontSize: '24px' }}>
            {inventario.totalVariedades} variedades · {formatoNumero(inventario.stockTotal, 0)} kg
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Valor stock: {formatoMoneda(inventario.valorTotal)}
          </div>
        </div>

        {/* KPIs Alertas */}
        <div className="kpi" style={{ background: alertas.stockCritico > 0 || alertas.lotesVencidos > 0 ? '#fef2f2' : '#f0fdf4', borderColor: alertas.stockCritico > 0 || alertas.lotesVencidos > 0 ? '#fecaca' : '#86efac' }}>
          <div className="etiqueta" style={{ color: alertas.stockCritico > 0 || alertas.lotesVencidos > 0 ? '#991b1b' : '#166534' }}>🚨 Alertas</div>
          <div className="valor" style={{ color: alertas.stockCritico > 0 || alertas.lotesVencidos > 0 ? '#991b1b' : '#166534', fontSize: '24px' }}>
            {alertas.stockCritico + alertas.preciosAnomalos + alertas.lotesVencidos}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            {alertas.stockCritico} stock crítico · {alertas.preciosAnomalos} precios anómalos · {alertas.lotesVencidos} vencidos
          </div>
        </div>
      </div>

      {/* Detalle por variedad - Ventas */}
      {ventas.porVariedad.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--color-primary)' }}>📊 Ventas por variedad</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ventas.porVariedad.slice(0, 5).map((v) => (
              <span key={v.variedad} style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#1e40af',
              }}>
                {v.variedad}: {formatearToneladas(v.kilos)} · {formatoMoneda(v.dinero)} · {v.registros} regs
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reposición urgente */}
      {inventario.requierenReposicion.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#991b1b' }}>🔴 Requieren reposición urgente</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {inventario.requierenReposicion.slice(0, 5).map((r) => (
              <span key={r.variedad} style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#991b1b',
              }}>
                {r.variedad}: disp {formatoNumero(r.stockDisponible, 1)}/{formatoNumero(r.stockMinimo, 1)} kg (faltan {formatoNumero(r.deficit, 1)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Próximos a vencer */}
      {inventario.proximosAVencer.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#92400e' }}>⏳ Próximos a vencer (≤30 días)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {inventario.proximosAVencer.slice(0, 5).map((v) => (
              <span key={`${v.variedad}-${v.lote}`} style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: '#92400e',
              }}>
                {v.variedad} lote {v.lote}: {v.diasRestantes}d
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Estados especiales */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--color-muted)' }}>
        {inventario.enCuarentena > 0 && <span style={{ background: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>🟡 Cuarentena: {inventario.enCuarentena}</span>}
        {inventario.enTransito > 0 && <span style={{ background: '#dbeafe', padding: '4px 8px', borderRadius: '4px' }}>🚚 En tránsito: {inventario.enTransito}</span>}
        {alertas.preciosAnomalos > 0 && <span style={{ background: '#fef2f2', padding: '4px 8px', borderRadius: '4px' }}>💰 Precios anómalos: {alertas.preciosAnomalos}</span>}
        {alertas.lotesVencidos > 0 && <span style={{ background: '#fee2e2', padding: '4px 8px', borderRadius: '4px' }}>⛔ Lotes vencidos: {alertas.lotesVencidos}</span>}
      </div>
    </div>
  );
}