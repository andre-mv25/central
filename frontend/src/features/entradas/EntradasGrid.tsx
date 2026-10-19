import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { gridTheme } from '../../utils/gridTheme';
import { formatoMoneda, formatoNumero } from '../../utils/format';
import { exportToExcel, formatoFechaExcel, formatoMonedaExcel, formatoNumeroExcel } from '../../utils/excel';
import type { EntradaMercancia } from '../../types';

interface Props {
  entradas: EntradaMercancia[];
  cargando: boolean;
  onEliminar: (id: number) => void;
}

function BotonEliminar(props: ICellRendererParams<EntradaMercancia>) {
  const onEliminar = (props as ICellRendererParams<EntradaMercancia> & {
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

export function EntradasGrid({ entradas, cargando, onEliminar }: Props) {
  const handleExport = () => {
    if (entradas.length === 0) return;
    const columns = [
      { header: 'Fecha', key: 'fecha', width: 12, formatter: (val: unknown) => formatoFechaExcel(val as string | Date | undefined) },
      { header: 'Proveedor', key: 'proveedor', width: 25 },
      { header: 'Clase', key: 'clase', width: 15 },
      { header: 'Calidad', key: 'calidad', width: 15 },
      { header: 'Bolsas', key: 'bolsas', width: 10, formatter: (val: unknown) => formatoNumeroExcel(val as string | number | null | undefined, 0) },
      { header: 'Kilos', key: 'kilos', width: 12, formatter: (val: unknown) => formatoNumeroExcel(val as string | number | null | undefined, 3) },
      { header: 'Precio', key: 'precio', width: 15, formatter: (val: unknown) => formatoMonedaExcel(val as string | number | null | undefined) },
      { header: 'Total', key: 'total', width: 15, formatter: (val: unknown) => formatoMonedaExcel(val as string | number | null | undefined) },
      { header: 'Observaciones', key: 'observaciones', width: 30 },
      { header: 'Registró', key: 'usuario', width: 20 },
      { header: 'Sucursal', key: 'sucursal', width: 15 },
    ] as const;
    const fecha = new Date().toISOString().split('T')[0];
    exportToExcel(entradas, columns, `entradas_${fecha}`, 'Entradas');
  };

  const columnDefs = useMemo<ColDef<EntradaMercancia>[]>(
    () => [
      { headerName: 'Fecha', field: 'fecha', width: 110, valueFormatter: (p) => String(p.value).slice(0, 10) },
      { headerName: 'Proveedor', field: 'proveedor', flex: 1, minWidth: 130 },
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
      { headerName: 'Observaciones', field: 'observaciones', flex: 1, minWidth: 150 },
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
    if (entradas.length === 0) return [];
    const totales = entradas.reduce(
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
        proveedor: 'TOTAL',
        clase: '',
        calidad: '',
        bolsas: totales.bolsas,
        kilos: totales.kilos.toFixed(3),
        precio: '',
        total: totales.total.toFixed(2),
        observaciones: '',
        usuario: '',
        id: 0,
        creado_at: '',
        actualizado_at: '',
        sucursal: '',
        proveedor_id: 0,
        clase_id: 0,
        calidad_id: 0,
        usuario_registro_id: 0,
      } as EntradaMercancia,
    ];
  }, [entradas]);

  return (
    <div className="grid-ventas">
      <div className="grid-toolbar">
        <button className="secundario" onClick={handleExport} disabled={entradas.length === 0}>
          📥 Exportar a Excel
        </button>
      </div>
      <AgGridReact<EntradaMercancia>
        theme={gridTheme}
        rowData={entradas}
        columnDefs={columnDefs}
        loading={cargando}
        defaultColDef={{ resizable: true, sortable: true }}
        overlayNoRowsTemplate="<span class='vacio'>Sin entradas registradas para el filtro</span>"
        pinnedBottomRowData={pinnedBottomRowData}
      />
    </div>
  );
}