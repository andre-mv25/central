import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  formatter?: (value: unknown) => string | number | Date | undefined;
}

export function exportToExcel<T>(
  data: T[],
  columns: readonly { header: string; key: string; width?: number; formatter?: (value: unknown) => string | number | Date | undefined }[],
  filename: string,
  sheetName = 'Datos',
) {
  const wsData: (string | number)[][] = [
    columns.map((c) => c.header),
    ...data.map((row) =>
      columns.map((col) => {
        const value = (row as Record<string, unknown>)[col.key];
        const formatted = col.formatter ? col.formatter(value) : value;
        return typeof formatted === 'string' || typeof formatted === 'number' ? formatted : String(formatted ?? '');
      }),
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  columns.forEach((col, idx) => {
    const colLetter = XLSX.utils.encode_col(idx);
    ws[`${colLetter}1`] = { ...ws[`${colLetter}1`], s: { font: { bold: true }, fill: { fgColor: { rgb: '2563EB' } }, fontColor: { rgb: 'FFFFFF' } } };
    if (col.width) {
      ws['!cols'] = ws['!cols'] || [];
      ws['!cols'][idx] = { wch: col.width };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function formatoFechaExcel(fecha: string | Date | undefined): string {
  if (!fecha) return '';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-ES');
}

export function formatoNumeroExcel(valor: string | number | null | undefined, decimales = 2): number {
  if (valor === null || valor === undefined || valor === '') return 0;
  return Number(Number(valor).toFixed(decimales));
}

export function formatoMonedaExcel(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '$0.00';
  return `$${Number(valor).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}