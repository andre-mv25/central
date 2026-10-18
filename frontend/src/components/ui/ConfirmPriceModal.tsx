import type { EvaluacionPrecio } from '../../types';

interface Props {
  abierto: boolean;
  mensaje: string;
  evaluacion?: EvaluacionPrecio | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmPriceModal({ abierto, mensaje, evaluacion, onConfirmar, onCancelar }: Props) {
  if (!abierto) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Advertencia de precio</h3>
        <p>{mensaje}</p>
        {evaluacion && (
          <p>
            Último precio: <strong>${evaluacion.ultimoPrecio?.toFixed(2)}</strong>
            {evaluacion.variacionPct !== null && (
              <>
                {' '}
                · Variación: <span className="badge alerta">{evaluacion.variacionPct}%</span>
              </>
            )}
            {' '}· Umbral permitido: {evaluacion.umbral}%
          </p>
        )}
        <div className="acciones">
          <button className="secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="peligro" onClick={onConfirmar}>
            Confirmar y guardar
          </button>
        </div>
      </div>
    </div>
  );
}
