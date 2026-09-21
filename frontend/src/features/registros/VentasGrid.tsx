import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { gridTheme } from '../../utils/gridTheme';
import { formatoMoneda, formatoNumero } from '../../utils/format';
import type { RegistroVenta } from '../../types';
import { exportVentasToExcel, ExportFormat } from '../../utils/excel';

interface Props {
  registros: RegistroVenta[];
  cargando: boolean;
  onEliminar: (id: number) => void;
}

function BotonEliminar(props: ICellRendererParams<RegistroVenta>) {
  const onEliminar = (props as ICellRendererParams<RegistroVenta> & {
    onEliminarRegistro?: (id: number) => void;
  }).onEliminarRegistro;

  return (
    <button
      className="peligro"
      style={{ padding: '2px 8px' }}
      onClick={() => props.data && onEliminar?.(props.data.id)}
    >
      Eliminar
    </button>
  );
}

export function VentasGrid({ registros, cargando, onEliminar }: Props) {
  const handleExport = (format: ExportFormat) => {
    if (registros.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    exportVentasToExcel(registros, `ventas-${new Date().toISOString().split('T')[0]}`, format);
  };

  // Calcular totales
  const totales = useMemo(() => {
    if (registros.length === 0) return { kilos: 0, importe: 0, bolsas: 0, registros: 0 };
    return registros.reduce(
      (acc, r) => ({
        kilos: acc.kilos + parseFloat(r.kilos),
        importe: acc.importe + parseFloat(r.total),
        bolsas: acc.bolsas + r.bolsas,
        registros: acc.registros + 1,
      }),
      { kilos: 0, importe: 0, bolsas: 0, registros: 0 }
    );
  }, [registros]);

  const columnDefs = useMemo<ColDef<RegistroVenta>[]>(
    () => [
      { headerName: 'Fecha', field: 'fecha', width: 110, valueFormatter: (p) => String(p.value).slice(0, 10) },
      { headerName: 'Comprador', field: 'comprador', flex: 1, minWidth: 130 },
      { headerName: 'Clase', field: 'clase', width: 150 },
      { headerName: 'Bolsas', field: 'bolsas', width: 85 },
      {
        headerName: 'Kilos',
        field: 'kilos',
        width: 100,
        valueGetter: (p) => Number(p.data?.kilos),
        valueFormatter: (p) => formatoNumero(p.value, 3),
      },
      {
        headerName: 'Precio',
        field: 'precio',
        width: 110,
        valueGetter: (p) => Number(p.data?.precio),
        valueFormatter: (p) => formatoMoneda(p.value),
      },
      {
        headerName: 'Total',
        field: 'total',
        width: 130,
        valueGetter: (p) => Number(p.data?.total),
        valueFormatter: (p) => formatoMoneda(p.value),
        cellStyle: { fontWeight: '600' },
      },
      { headerName: 'Registró', field: 'usuario', width: 170 },
      {
        headerName: '',
        colId: 'acciones',
        width: 100,
        cellRenderer: BotonEliminar,
        cellRendererParams: { onEliminarRegistro: onEliminar },
      },
    ],
    [onEliminar],
  );

  return (
    <div className="grid-ventas">
      <div className="grid-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Exportar:</span>
          <button className="secundario" onClick={() => handleExport('xlsx')} disabled={registros.length === 0 || cargando}>
            Excel (.xlsx)
          </button>
          <button className="secundario" onClick={() => handleExport('csv')} disabled={registros.length === 0 || cargando}>
            CSV (.csv)
          </button>
        </div>
        {registros.length > 0 && (
          <div className="toolbar-group resumen-totales">
            <span className="toolbar-label">Totales:</span>
            <span><strong>Registros:</strong> {totales.registros}</span>
            <span><strong>Bolsas:</strong> {totales.bolsas}</span>
            <span><strong>Kilos:</strong> {formatoNumero(totales.kilos, 3)}</span>
            <span><strong>Importe:</strong> {formatoMoneda(totales.importe)}</span>
          </div>
        )}
      </div>
      <AgGridReact<RegistroVenta>
        theme={gridTheme}
        rowData={registros}
        columnDefs={columnDefs}
        loading={cargando}
        defaultColDef={{ resizable: true, sortable: true }}
        overlayNoRowsTemplate="<span class='vacio'>Sin ventas registradas para el filtro</span>"
        pinnedBottomRowData={registros.length > 0 ? [{
          fecha: '',
          comprador: 'TOTALES',
          clase: '',
          bolsas: totales.bolsas,
          kilos: totales.kilos.toFixed(3),
          precio: 0,
          total: totales.importe.toFixed(2),
          usuario: '',
        }] : []}
      />
    </div>
  );
}
