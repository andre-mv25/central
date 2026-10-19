import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { gridTheme } from '../../utils/gridTheme';
import { formatoMoneda } from '../../utils/format';
import type { FilaEntrada } from '../../types';

interface Props {
  filas: FilaEntrada[];
  guardando: boolean;
  onCeldaCambiada: (fila: FilaEntrada, campo: string) => void;
  onEliminarFila: (id: string) => void;
}

function BotonEliminar(props: ICellRendererParams<FilaEntrada>) {
  const onEliminar = (props as ICellRendererParams<FilaEntrada> & {
    onEliminarFila?: (id: string) => void;
  }).onEliminarFila;

  return (
    <button
      className="peligro"
      style={{ padding: '2px 8px' }}
      onClick={() => props.data && onEliminar?.(props.data.id)}
    >
      Quitar
    </button>
  );
}

export function CapturaEntradasGrid({
  filas,
  guardando,
  onCeldaCambiada,
  onEliminarFila,
}: Props) {
  const columnDefs = useMemo<ColDef<FilaEntrada>[]>(
    () => [
      {
        headerName: 'Proveedor',
        field: 'proveedorNombre',
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
        headerName: 'Observaciones',
        field: 'observaciones',
        flex: 1,
        minWidth: 150,
        cellEditor: 'agTextCellEditor',
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
        const bolsas = Number(f.bolsas) || 0;
        const kilos = Number(f.kilos) || 0;
        const precio = Number(f.precio) || 0;
        acc.total += bolsas * kilos * precio;
        return acc;
      },
      { bolsas: 0, kilos: 0, total: 0 },
    );
    return [
      {
        proveedorNombre: 'TOTAL',
        claseNombre: '',
        calidadNombre: '',
        bolsas: totales.bolsas,
        kilos: totales.kilos,
        total: totales.total,
        precio: null,
        observaciones: '',
        id: 'total-row',
      } as FilaEntrada,
    ];
  }, [filas]);

  return (
    <div className="grid-captura">
      <AgGridReact<FilaEntrada>
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
        overlayNoRowsTemplate="<span class='vacio'>Agrega una fila para capturar entrada</span>"
        pinnedBottomRowData={pinnedBottomRowData}
      />
    </div>
  );
}