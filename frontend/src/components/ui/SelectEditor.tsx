import type { CustomCellEditorProps } from 'ag-grid-react';

export interface OpcionSelect {
  value: number;
  label: string;
}

export interface SelectEditorParams extends CustomCellEditorProps<unknown, number | null> {
  opciones: OpcionSelect[];
}

export function SelectEditor({
  value,
  onValueChange,
  stopEditing,
  opciones,
}: SelectEditorParams) {
  return (
    <select
      autoFocus
      value={value ?? ''}
      onChange={(event) => {
        onValueChange(event.target.value ? Number(event.target.value) : null);
        stopEditing();
      }}
      style={{ width: '100%' }}
    >
      <option value="">—</option>
      {opciones.map((opcion) => (
        <option key={opcion.value} value={opcion.value}>
          {opcion.label}
        </option>
      ))}
    </select>
  );
}
