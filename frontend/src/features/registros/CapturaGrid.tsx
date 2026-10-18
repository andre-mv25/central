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

export function CapturaGrid({
  filas,
  guardando,
  onCeldaCambiada,
  onEliminarFila,
}: Props) {
  const columnDefs = useMemo<ColDef<FilaCaptura>[]>(
    () => [
      {
        headerName: 'Comprador',
        field: 'compradorNombre',
        flex: 1,
        minWidth: 140,
        cellEditor: 'agTextCellEditor',
      },
      {
        headerName: 'Clase',
        field: 'claseNombre',
        width: 110,
        cellEditor: 'agTextCellEditor',
      },
      {
        headerName: 'Calidad',
        field: 'calidadNombre',
        width: 110,
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
        headerName: 'Último',
        colId: 'ultimoPrecio',
        width: 110,
        editable: false,
        valueGetter: (p) => p.data?.ultimoPrecio ?? null,
        valueFormatter: (p) => (p.value != null ? formatoMoneda(p.value) : '—'),
      },
      {
        headerName: 'Total',
        colId: 'total',
        width: 130,
        editable: false,
        valueGetter: (p) => {
          const kilos = Number(p.data?.kilos);
          const precio = Number(p.data?.precio);
          return kilos > 0 && precio > 0 ? kilos * precio : null;
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

  const pinnedBottomRowData = useMemo(() => {
    if (filas.length === 0) return [];
    const totales = filas.reduce(
      (acc, f) => {
        acc.bolsas += Number(f.bolsas) || 0;
        acc.kilos += Number(f.kilos) || 0;
        const kilos = Number(f.kilos) || 0;
        const precio = Number(f.precio) || 0;
        acc.total += kilos * precio;
        return acc;
      },
      { bolsas: 0, kilos: 0, total: 0 },
    );
    return [
      {
        compradorNombre: 'TOTAL',
        bolsas: totales.bolsas,
        kilos: totales.kilos,
        total: totales.total,
        precio: null,
        ultimoPrecio: null,
        claseNombre: '',
        calidadNombre: '',
        id: 'total-row',
      } as FilaCaptura,
    ];
  }, [filas]);

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
        pinnedBottomRowData={pinnedBottomRowData}
      />
    </div>
  );
}
