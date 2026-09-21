import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { KpiCards } from '../dashboard/KpiCards';
import { ConfirmPriceModal } from '../../components/ui/ConfirmPriceModal';
import { apiErrorMessage } from '../../services/api';
import { historialService, reportesService } from '../../services/reportes.service';
import { registrosService } from '../../services/registros.service';
import { CapturaGrid } from './CapturaGrid';
import { VentasGrid } from './VentasGrid';
import { fechaHoy, nuevoIdTemporal } from '../../utils/format';
import type { EvaluacionPrecio, FilaCaptura, Kpis, RegistroVenta } from '../../types';

interface ModalState {
  abierto: boolean;
  mensaje: string;
  evaluacion: EvaluacionPrecio | null;
}

const MODAL_CERRADO: ModalState = { abierto: false, mensaje: '', evaluacion: null };

export function RegistrosPage() {
  const [fecha, setFecha] = useState(fechaHoy());
  const [registros, setRegistros] = useState<RegistroVenta[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [filas, setFilas] = useState<FilaCaptura[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>(MODAL_CERRADO);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [regs, kpiData] = await Promise.all([
        registrosService.listar({ fecha }),
        reportesService.kpis(fecha),
      ]);
      setRegistros(regs);
      setKpis(kpiData);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const evaluarLocal = (fila: FilaCaptura, umbral: number) => {
    const { ultimoPrecio, precio } = fila;
    if (ultimoPrecio && ultimoPrecio > 0 && precio && precio > 0) {
      const variacion = (Math.abs(precio - ultimoPrecio) / ultimoPrecio) * 100;
      return { variacionPct: Number(variacion.toFixed(2)), alertaPrecio: variacion > umbral };
    }
    return { variacionPct: null, alertaPrecio: false };
  };

  const onCeldaCambiada = async (filaActualizada: FilaCaptura, campo: string) => {
    let fila = { ...filaActualizada };
    let umbralActual = 20;

    if (campo === 'clase') {
      if (fila.clase?.trim()) {
        try {
          const evaluacion = await historialService.evaluarPrecioPorNombres(
            fila.clase,
          );
          umbralActual = evaluacion.umbral;
          fila = { ...fila, ultimoPrecio: evaluacion.ultimoPrecio };
        } catch {
          fila = { ...fila, ultimoPrecio: null };
        }
      } else {
        fila = { ...fila, ultimoPrecio: null };
      }
    }

    fila = { ...fila, ...evaluarLocal(fila, umbralActual) };
    setFilas((prev) => prev.map((f) => (f.id === fila.id ? fila : f)));
  };

  const agregarFila = () => {
    setFilas((prev) => [
      ...prev,
      {
        id: nuevoIdTemporal(),
        comprador: null,
        clase: null,
        bolsas: null,
        kilos: null,
        precio: null,
        ultimoPrecio: null,
      },
    ]);
  };

  const eliminarFila = (id: string) => {
    setFilas((prev) => prev.filter((f) => f.id !== id));
  };

  const finalizarGuardado = async () => {
    setFilas([]);
    await cargarDatos();
  };

  const guardarTodo = async () => {
    if (filas.length === 0) return;
    const invalida = filas.find(
      (f) =>
        !f.comprador?.trim() ||
        !f.clase?.trim() ||
        !(f.bolsas && f.bolsas > 0) ||
        !(f.kilos && f.kilos > 0) ||
        !(f.precio && f.precio > 0),
    );
    if (invalida) {
      setError('Completa comprador, clase, bolsas, kilos y precio en todas las filas');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      await registrosService.crearLote(filas, false, fecha);
      await finalizarGuardado();
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 422 &&
        err.response.data?.requiereConfirmacion
      ) {
        setModal({
          abierto: true,
          mensaje: String(err.response.data.message),
          evaluacion: err.response.data.evaluacion ?? null,
        });
      } else {
        setError(apiErrorMessage(err));
      }
    } finally {
      setGuardando(false);
    }
  };

  const confirmarGuardado = async () => {
    setModal(MODAL_CERRADO);
    setGuardando(true);
    setError('');
    try {
      await registrosService.crearLote(filas, true, fecha);
      await finalizarGuardado();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarRegistro = async (id: number) => {
    if (!window.confirm('¿Eliminar esta venta?')) return;
    try {
      await registrosService.eliminar(id);
      await cargarDatos();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">Operación diaria</span><h2>Registro de ventas</h2><p>Captura ventas por lote y consulta el resultado del día.</p></div>
      </div>

      <div className="panel filtro-panel">
        <div className="section-heading"><div><h2>Consulta de ventas</h2><p>Selecciona la fecha que deseas revisar.</p></div></div>
        <div className="filtros filtros-compactos">
          <label>
            Fecha
            <input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          </label>
        </div>
      </div>

      <KpiCards kpis={kpis} />

      {error && <div className="panel error-msg">{error}</div>}

      <div className="panel panel-captura">
        <div className="section-heading"><div><h2>Nueva captura</h2><p>Agrega una o varias ventas antes de guardarlas.</p></div><span className="counter">{filas.length} {filas.length === 1 ? 'fila' : 'filas'}</span></div>
        <div className="acciones-grid">
          <button className="secundario" onClick={agregarFila} disabled={guardando}>
            + Agregar fila
          </button>
          <button onClick={guardarTodo} disabled={guardando || filas.length === 0}>
            {guardando ? 'Guardando...' : `Guardar todo (${filas.length})`}
          </button>
        </div>
        <CapturaGrid
          filas={filas}
          guardando={guardando}
          onCeldaCambiada={onCeldaCambiada}
          onEliminarFila={eliminarFila}
        />
      </div>

      <div className="panel">
        <div className="section-heading"><div><h2>Ventas registradas</h2><p>Movimientos guardados para la fecha seleccionada.</p></div></div>
        <VentasGrid registros={registros} cargando={cargando} onEliminar={eliminarRegistro} />
      </div>

      <ConfirmPriceModal
        abierto={modal.abierto}
        mensaje={modal.mensaje}
        evaluacion={modal.evaluacion}
        onConfirmar={confirmarGuardado}
        onCancelar={() => setModal(MODAL_CERRADO)}
      />
    </>
  );
}
