import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { SelectEditor, type OpcionSelect } from '../../components/ui/SelectEditor';
import { gridTheme } from '../../utils/gridTheme';
import { formatoMoneda } from '../../utils/format';
import type { Calidad, Clase, Comprador, FilaCaptura } from '../../types';

interface Props {
  filas: FilaCaptura[];
  compradores: Comprador[];
  clases: Clase[];
  calidades: Calidad[];
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
  compradores,
  clases,
  calidades,
  guardando,
  onCeldaCambiada,
  onEliminarFila,
}: Props) {
  const opcionesCompradores = useMemo<OpcionSelect[]>(
    () => compradores.map((c) => ({ value: c.id, label: c.nombre })),
    [compradores],
  );
  const opcionesClases = useMemo<OpcionSelect[]>(
    () => clases.map((c) => ({ value: c.id, label: c.nombre_clase })),
    [clases],
  );
  const opcionesCalidades = useMemo<OpcionSelect[]>(
    () => calidades.map((c) => ({ value: c.id, label: c.nombre_calidad })),
    [calidades],
  );

  const nombreComprador = useMemo(() => new Map(compradores.map((c) => [c.id, c.nombre])), [compradores]);
  const nombreClase = useMemo(() => new Map(clases.map((c) => [c.id, c.nombre_clase])), [clases]);
  const nombreCalidad = useMemo(() => new Map(calidades.map((c) => [c.id, c.nombre_calidad])), [calidades]);

  const columnDefs = useMemo<ColDef<FilaCaptura>[]>(
    () => [
      {
        headerName: 'Comprador',
        field: 'compradorId',
        flex: 1,
        minWidth: 140,
        cellEditor: SelectEditor,
        cellEditorParams: { opciones: opcionesCompradores },
        valueFormatter: (p) => (p.value ? nombreComprador.get(p.value) ?? '' : ''),
      },
      {
        headerName: 'Clase',
        field: 'claseId',
        width: 110,
        cellEditor: SelectEditor,
        cellEditorParams: { opciones: opcionesClases },
        valueFormatter: (p) => (p.value ? nombreClase.get(p.value) ?? '' : ''),
      },
      {
        headerName: 'Calidad',
        field: 'calidadId',
        width: 110,
        cellEditor: SelectEditor,
        cellEditorParams: { opciones: opcionesCalidades },
        valueFormatter: (p) => (p.value ? nombreCalidad.get(p.value) ?? '' : ''),
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
    [opcionesCompradores, opcionesClases, opcionesCalidades, nombreComprador, nombreClase, nombreCalidad, onEliminarFila],
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
