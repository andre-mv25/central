import { useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { gridTheme } from '../../utils/gridTheme';
import { formatoMoneda } from '../../utils/format';
import type { FilaCaptura } from '../../types';
import { exportCapturaToExcel, importFromExcel, parseCapturaRow, ExportFormat } from '../../utils/excel';

interface Props {
  filas: FilaCaptura[];
  variedades: string[];
  guardando: boolean;
  onCeldaCambiada: (fila: FilaCaptura, campo: string) => void;
  onEliminarFila: (id: string) => void;
  onImportar?: (filas: FilaCaptura[]) => void;
}

function BotonEliminar(props: ICellRendererParams<FilaCaptura>) {
  const onEliminar = (props as ICellRendererParams<FilaCaptura> & {
    onEliminarFila?: (id: string) => void;
  }).onEliminarFila;

  return (
    <button
      className="secundario"
      style={{ padding: '2px 8px' }}
      onClick={() => props.data && onEliminar?.(props.data.id)}
    >
      Quitar
    </button>
  );
}

export function CapturaGrid({ filas, variedades, guardando, onCeldaCambiada, onEliminarFila, onImportar }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (format: ExportFormat) => {
    if (filas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    exportCapturaToExcel(filas, `captura-${new Date().toISOString().split('T')[0]}`, format);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { data, errors } = await importFromExcel(file, parseCapturaRow);
      
      if (errors.length > 0) {
        alert(`Se encontraron ${errors.length} errores:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
      }
      
      if (data.length > 0 && onImportar) {
        onImportar(data);
      }
      
      if (event.target) {
        event.target.value = '';
      }
    } catch (error) {
      alert(`Error al importar: ${error instanceof Error ? error.message : 'Desconocido'}`);
    }
  };

  const columnDefs = useMemo<ColDef<FilaCaptura>[]>(
    () => [
      {
        headerName: 'Comprador',
        field: 'comprador',
        flex: 1,
        minWidth: 140,
        cellEditor: 'agTextCellEditor',
      },
      {
        headerName: 'Producto (manual)',
        field: 'clase',
        flex: 1,
        minWidth: 160,
        cellEditor: 'agTextCellEditor',
      },
      { headerName: 'Bolsas', field: 'bolsas', width: 90, cellEditor: 'agNumberCellEditor' },
      { headerName: 'Kilos', field: 'kilos', width: 110, cellEditor: 'agNumberCellEditor' },
      {
        headerName: 'Precio',
        field: 'precio',
        width: 120,
        cellEditor: 'agNumberCellEditor',
        cellClassRules: { 'celda-precio-alerta': (p) => p.data?.alertaPrecio === true },
      },
      {
        headerName: 'Total',
        colId: 'total',
        width: 130,
        editable: false,
        valueGetter: (p) => {
          const bolsas = Number(p.data?.bolsas);
          const kilos = Number(p.data?.kilos);
          const precio = Number(p.data?.precio);
          return bolsas > 0 && kilos > 0 && precio > 0 ? bolsas * kilos * precio : null;
        },
        valueFormatter: (p) => (p.value != null ? formatoMoneda(p.value) : '—'),
        cellStyle: { fontWeight: '600' },
      },
      {
        headerName: '',
        colId: 'acciones',
        width: 90,
        editable: false,
        cellRenderer: BotonEliminar,
        cellRendererParams: { onEliminarFila },
      },
    ],
    [onEliminarFila, variedades],
  );

  return (
    <div className="grid-captura">
      <div className="grid-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Exportar:</span>
          <button className="secundario" onClick={() => handleExport('xlsx')} disabled={filas.length === 0 || guardando}>
            Excel (.xlsx)
          </button>
          <button className="secundario" onClick={() => handleExport('csv')} disabled={filas.length === 0 || guardando}>
            CSV (.csv)
          </button>
        </div>
        {onImportar && (
          <div className="toolbar-group">
            <span className="toolbar-label">Importar:</span>
            <button className="secundario" onClick={handleImportClick} disabled={guardando}>
              Desde Excel/CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={guardando}
            />
          </div>
        )}
      </div>
      <AgGridReact<FilaCaptura>
        theme={gridTheme}
        rowData={filas}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        defaultColDef={{ editable: !guardando, resizable: true, sortable: false }}
        onCellValueChanged={(event) => {
          if (event.data && event.colDef.field) {
            onCeldaCambiada({ ...event.data }, event.colDef.field);
          }
        }}
        stopEditingWhenCellsLoseFocus
        suppressRowClickSelection
        overlayNoRowsTemplate="<span class='vacio'>Agrega una fila para capturar</span>"
      />
    </div>
  );
}
