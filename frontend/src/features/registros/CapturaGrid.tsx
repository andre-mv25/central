import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { gridTheme } from '../../utils/gridTheme';
import { formatoMoneda } from '../../utils/format';
import type { FilaCaptura } from '../../types';

interface Props {
  filas: FilaCaptura[];
  guardando: boolean;
  onCeldaCambiada: (fila: FilaCaptura, campo: string) => void;
  onEliminarFila: (id: string) => void;
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

export function CapturaGrid({ filas, guardando, onCeldaCambiada, onEliminarFila }: Props) {
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
        headerName: 'Clase',
        field: 'clase',
        flex: 1,
        minWidth: 140,
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
    [onEliminarFila],
  );

  return (
    <div className="grid-captura">
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
