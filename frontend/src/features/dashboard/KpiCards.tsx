import { formatoMoneda, formatoNumero } from '../../utils/format';
import type { Kpis } from '../../types';

export function KpiCards({ kpis }: { kpis: Kpis | null }) {
  return (
    <div className="kpis">
      <div className="kpi">
        <div className="etiqueta">Total Kilos Hoy</div>
        <div className="valor">{formatoNumero(kpis?.totalKilos ?? 0)} kg</div>
      </div>
      <div className="kpi">
        <div className="etiqueta">Total Dinero Hoy</div>
        <div className="valor">{formatoMoneda(kpis?.totalDinero ?? 0)}</div>
      </div>
      <div className="kpi">
        <div className="etiqueta">Registros</div>
        <div className="valor">{kpis?.totalRegistros ?? 0}</div>
      </div>
    </div>
  );
}
