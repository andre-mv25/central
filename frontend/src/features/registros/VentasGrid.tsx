import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { gridTheme } from '../../utils/gridTheme';
import { formatoMoneda, formatoNumero } from '../../utils/format';
import { exportToExcel, formatoFechaExcel } from '../../utils/excel';
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
  const handleExport = () => {
    if (registros.length === 0) return;
    const columns = [
      { header: 'Creado', key: 'creado_at', width: 20, formatter: (val: unknown) => formatoFechaExcel(val as string | Date | undefined) },
    ] as const;
    const fecha = new Date().toISOString().split('T')[0];
    exportToExcel(registros, columns, `ventas_${fecha}`, 'Ventas');
  };

  const columnDefs = useMemo<ColDef<RegistroVenta>[]>(
    () => [
      { headerName: 'Fecha', field: 'fecha', width: 110, valueFormatter: (p) => String(p.value).slice(0, 10) },
      { headerName: 'Comprador', field: 'comprador', flex: 1, minWidth: 130 },
      { headerName: 'Clase', field: 'clase', width: 90 },
      { headerName: 'Calidad', field: 'calidad', width: 100 },
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

  const pinnedBottomRowData = useMemo(() => {
    if (registros.length === 0) return [];
    const totales = registros.reduce(
      (acc, r) => {
        acc.bolsas += Number(r.bolsas) || 0;
        acc.kilos += Number(r.kilos) || 0;
        acc.total += Number(r.total) || 0;
        return acc;
      },
      { bolsas: 0, kilos: 0, total: 0 },
    );
    return [
      {
        fecha: '',
        comprador: 'TOTAL',
        clase: '',
        calidad: '',
        bolsas: totales.bolsas,
        kilos: totales.kilos.toFixed(3),
        precio: '',
        total: totales.total.toFixed(2),
        usuario: '',
        id: 0,
        creado_at: '',
        actualizado_at: '',
        sucursal: '',
        comprador_id: 0,
        clase_id: 0,
        calidad_id: 0,
        usuario_registro_id: 0,
      } as RegistroVenta,
    ];
  }, [registros]);

  return (
    <div className="grid-ventas">
      <div className="grid-toolbar">
        <button className="secundario" onClick={handleExport} disabled={registros.length === 0}>
           Exportar a Excel
        </button>
      </div>
      <AgGridReact<RegistroVenta>
        theme={gridTheme}
        rowData={registros}
        columnDefs={columnDefs}
        loading={cargando}
        defaultColDef={{ resizable: true, sortable: true }}
        overlayNoRowsTemplate="<span class='vacio'>Sin ventas registradas para el filtro</span>"
        pinnedBottomRowData={pinnedBottomRowData}
      />
    </div>
  );
}
