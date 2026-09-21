import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { gridTheme } from '../../utils/gridTheme';
import { formatoMoneda, formatoNumero } from '../../utils/format';
import type { RegistroVenta } from '../../types';

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
      <AgGridReact<RegistroVenta>
        theme={gridTheme}
        rowData={registros}
        columnDefs={columnDefs}
        loading={cargando}
        defaultColDef={{ resizable: true, sortable: true }}
        overlayNoRowsTemplate="<span class='vacio'>Sin ventas registradas para el filtro</span>"
      />
    </div>
  );
}
