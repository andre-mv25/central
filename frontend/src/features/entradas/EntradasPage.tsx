import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../../services/api';
import { entradasMercanciaService } from '../../services/entradas-mercancia.service';
import { CapturaEntradasGrid } from './CapturaEntradasGrid';
import { EntradasGrid } from './EntradasGrid';
import { fechaHoy, nuevoIdTemporal } from '../../utils/format';
import type {
  EntradaMercancia,
  FilaEntrada,
} from '../../types';

export function EntradasPage() {
  const [fecha, setFecha] = useState(fechaHoy());
  const [entradas, setEntradas] = useState<EntradaMercancia[]>([]);
  const [filas, setFilas] = useState<FilaEntrada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const regs = await entradasMercanciaService.listar({ fecha });
      setEntradas(regs);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const onCeldaCambiada = (_filaActualizada: FilaEntrada, _campo: string) => {
    // No evaluation needed for entries, just update the row
  };

  const agregarFila = () => {
    setFilas((prev) => [
      ...prev,
      {
        id: nuevoIdTemporal(),
        proveedorNombre: '',
        claseNombre: '',
        calidadNombre: '',
        bolsas: null,
        kilos: null,
        precio: null,
        observaciones: '',
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
        !f.proveedorNombre ||
        !f.claseNombre ||
        !f.calidadNombre ||
        !(f.bolsas && f.bolsas > 0) ||
        !(f.kilos && f.kilos > 0) ||
        !(f.precio && f.precio > 0),
    );
    if (invalida) {
      setError('Completa proveedor, clase, calidad, bolsas, kilos y precio en todas las filas');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      await entradasMercanciaService.crearLote(filas);
      await finalizarGuardado();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarEntrada = async (id: number) => {
    if (!window.confirm('¿Eliminar esta entrada de mercancía?')) return;
    try {
      await entradasMercanciaService.eliminar(id);
      await cargarDatos();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <>
      <div className="panel">
        <h2>Filtros</h2>
        <div className="filtros">
          <label>
            Fecha
            <input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          </label>
        </div>
      </div>

      {error && <div className="panel error-msg">{error}</div>}

      <div className="panel">
        <h2>Recepción de Mercancía</h2>
        <div className="acciones-grid">
          <button className="secundario" onClick={agregarFila} disabled={guardando}>
            + Agregar fila
          </button>
          <button onClick={guardarTodo} disabled={guardando || filas.length === 0}>
            {guardando ? 'Guardando...' : `Guardar todo (${filas.length})`}
          </button>
        </div>
        <CapturaEntradasGrid
          filas={filas}
          guardando={guardando}
          onCeldaCambiada={onCeldaCambiada}
          onEliminarFila={eliminarFila}
        />
      </div>

      <div className="panel">
        <h2>Entradas registradas</h2>
        <EntradasGrid entradas={entradas} cargando={cargando} onEliminar={eliminarEntrada} />
      </div>
    </>
  );
}