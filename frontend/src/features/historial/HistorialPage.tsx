import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AG_GRID_LOCALE_SPANISH } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AgGridReact } from 'ag-grid-react';
import { historialService } from './historial.service';
import { HistorialItem } from './historial.service';
import * as XLSX from 'xlsx';

export default function HistorialPage() {
  const navigate = useNavigate();
  const [rowData, setRowData] = useState<HistorialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const columnDefs = [
    { field: 'fecha', headerName: 'Fecha', width: 160 },
    { field: 'usuario_email', headerName: 'Usuario', width: 140 },
    { field: 'accion', headerName: 'Acción', width: 140 },
    { field: 'entidad', headerName: 'Entidad', width: 120 },
    { field: 'entidad_id', headerName: 'ID Entidad', width: 100 },
    { field: 'detalles', headerName: 'Detalles', width: 250, valueFormatter: (params: any) => params.value ? JSON.stringify(params.value) : '' }
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const resultado = await historialService.listar({
        fechaDesde,
        fechaHasta,
        accion: filtroAccion || undefined,
        entidad: filtroEntidad || undefined,
        limite: 100,
        pagina: 1
      });
      setRowData(resultado.data);
      setTotal(resultado.total);
    } catch {
      // error manejado por interceptor de api
    } finally {
      setCargando(false);
    }
  };

  const exportarExcel = () => {
    const datosExportar = rowData.map((fila) => ({
      Fecha: fila.fecha,
      Usuario: fila.usuario_email,
      Acción: fila.accion,
      Entidad: fila.entidad,
      'ID Entidad': fila.entidad_id,
      Detalles: fila.detalles ? JSON.stringify(fila.detalles) : ''
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExportar);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Historial');
    XLSX.writeFile(libro, `historial_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const limpiarAntiguo = async () => {
    if (!confirm('¿Eliminar historial con más de 3 días?')) return;
    try {
      const resultado = await historialService.limpiar(3);
      alert(`Se eliminaron ${resultado.eliminados ?? 0} registros.`);
      cargarHistorial();
    } catch {
      // error
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Historial de acciones</h1>
          <p className="text-gray-600">{total} registros encontrados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportarExcel}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar Excel
          </button>
          <button
            onClick={limpiarAntiguo}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Limpiar (>3 días)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Acción</label>
          <input
            className="border rounded px-3 py-2"
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            placeholder="ej. VENTA_CREAR"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Entidad</label>
          <input
            className="border rounded px-3 py-2"
            value={filtroEntidad}
            onChange={(e) => setFiltroEntidad(e.target.value)}
            placeholder="ej. registros_ventas"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Desde</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Hasta</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
          <span className="text-sm font-medium">Últimas acciones</span>
          <button
            onClick={cargarHistorial}
            className="text-sm text-blue-600 hover:underline"
            disabled={cargando}
          >
            {cargando ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
        <div className="relative">
          <AgGridReact
            columnDefs={columnDefs}
            rowData={rowData}
            defaultColDef={defaultColDef}
            rowHeight={42}
            headerHeight={40}
            localeText={AG_GRID_LOCALE_SPANISH}
            className="ag-theme-alpine"
            style={{ width: '100%', height: 500 }}
          />
        </div>
      </div>
    </div>
  );
}
