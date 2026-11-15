import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  MessageCircle,
  Scissors,
  Trash2,
  X,
} from 'lucide-react';
import {
  WORKERS,
  formatDateKeyLabel,
  formatMoney,
  formatTime,
  openWhatsApp,
} from '../utils/format';

export default function CorteDetailModal({
  corte,
  allJobs = [],
  onClose,
  onRequestDelete,
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!corte) return null;

  // Encontrar trabajos que pertenecen a este corte
  const corteJobs = allJobs.filter((job) => {
    if (Array.isArray(corte.jobIds) && corte.jobIds.length > 0) {
      return corte.jobIds.includes(job.id);
    }
    if (corte.openedAt && corte.closedAt) {
      const jobTime = new Date(job.createdAt).getTime();
      const openTime = new Date(corte.openedAt).getTime();
      const closeTime = new Date(corte.closedAt).getTime();
      return jobTime >= openTime && jobTime <= closeTime;
    }
    return false;
  });

  function handleShareWhatsApp() {
    const lines = [
      `*DINORA BEAUTY NAILS - ${corte.corteLabel || 'CORTE DE CAJA'}*`,
      `Fecha: ${formatDateKeyLabel(corte.dateKey)}`,
      `Horario: Apertura ${formatTime(corte.openedAt)} • Corte ${formatTime(corte.closedAt)}`,
      `Trabajos registrados: ${corte.jobCount}`,
      `------------------------------`,
      `*Total servicios:* ${formatMoney(corte.totalServicios)}`,
      `• Lizzy Dinora: ${formatMoney(corte.lizzyServicios)}`,
      `• Sandra: ${formatMoney(corte.sandraServicios)}`,
      `------------------------------`,
      `Base en caja: ${formatMoney(corte.baseAmount)}`,
      `Efectivo cobrado: ${formatMoney(corte.efectivoCobrado)}`,
      `Transferencias: ${formatMoney(corte.transferenciaTotal)}`,
    ];

    if (corte.valesTotal > 0) {
      lines.push(`Vales personales: -${formatMoney(corte.valesTotal)}`);
    }
    if (corte.gastosTotal > 0) {
      lines.push(`Gastos del salón: -${formatMoney(corte.gastosTotal)}`);
    }

    lines.push(`------------------------------`);
    lines.push(`*Efectivo esperado:* ${formatMoney(corte.efectivoEsperado)}`);
    lines.push(`*Efectivo físico contado:* ${formatMoney(corte.efectivoContado)}`);

    if (corte.diferencia !== 0) {
      lines.push(
        `Diferencia: ${corte.diferencia > 0 ? '+' : ''}${formatMoney(corte.diferencia)}`
      );
    } else {
      lines.push(`Caja cuadrada exacta.`);
    }

    if (corte.note) {
      lines.push(`Nota: ${corte.note}`);
    }

    openWhatsApp(lines.join('\n'));
  }

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="corte-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overscroll-contain overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="my-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#2B2921] bg-[#161511] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#26241D] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#D8CFBC] px-2 py-0.5 text-xs font-extrabold text-[#11120D]">
                {corte.corteLabel || `Corte #${corte.corteNumber || 1}`}
              </span>
              <h2 id="corte-detail-title" className="text-base font-extrabold text-[#FFFBF4]">
                {formatDateKeyLabel(corte.dateKey)}
              </h2>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D8CFBC]">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#D8CFBC]" aria-hidden="true" />
                Apertura: {formatTime(corte.openedAt)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                Corte: {formatTime(corte.closedAt)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-xl border border-[#565449] p-2 text-[#9E9A8B] hover:text-[#FFFBF4]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Resumen principal */}
        <div className="my-4 rounded-2xl border border-[#D8CFBC]/30 bg-[#11120D] p-4 text-center">
          <span className="text-xs font-semibold text-[#D8CFBC]">Total del corte</span>
          <div className="mt-0.5 text-3xl font-extrabold text-[#FFFBF4]">
            {formatMoney(corte.totalServicios)}
          </div>
          <div className="mt-1 text-xs text-[#9E9A8B]">
            {corte.jobCount} {corte.jobCount === 1 ? 'trabajo realizado' : 'trabajos realizados'}
          </div>
        </div>

        {/* Colaboradoras */}
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-[#565449]/60 bg-[#11120D] p-3">
            <div className="text-xs font-semibold text-[#D8CFBC]">Lizzy Dinora Viera</div>
            <div className="mt-1 text-lg font-extrabold text-[#FFFBF4]">
              {formatMoney(corte.lizzyServicios)}
            </div>
          </div>
          <div className="rounded-xl border border-[#565449]/60 bg-[#11120D] p-3">
            <div className="text-xs font-semibold text-[#D8CFBC]">Sandra Viera</div>
            <div className="mt-1 text-lg font-extrabold text-[#FFFBF4]">
              {formatMoney(corte.sandraServicios)}
            </div>
          </div>
        </div>

        {/* Arqueo de Caja */}
        <div className="mb-4 space-y-2 rounded-2xl border border-[#565449]/60 bg-[#11120D] p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#9E9A8B]">Base inicial en caja:</span>
            <span className="font-bold text-[#FFFBF4]">{formatMoney(corte.baseAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9E9A8B]">Efectivo cobrado:</span>
            <span className="font-bold text-[#FFFBF4]">{formatMoney(corte.efectivoCobrado)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9E9A8B]">Cobrado por transferencias:</span>
            <span className="font-bold text-[#FFFBF4]">{formatMoney(corte.transferenciaTotal)}</span>
          </div>
          {corte.valesTotal > 0 && (
            <div className="flex items-center justify-between text-amber-300">
              <span>Vales personales retirados:</span>
              <span className="font-bold">-{formatMoney(corte.valesTotal)}</span>
            </div>
          )}
          {corte.gastosTotal > 0 && (
            <div className="flex items-center justify-between text-[#D8CFBC]">
              <span>Gastos del salón:</span>
              <span className="font-bold">-{formatMoney(corte.gastosTotal)}</span>
            </div>
          )}
          <div className="border-t border-[#565449]/50 pt-2">
            <div className="flex items-center justify-between font-bold">
              <span className="text-[#D8CFBC]">Efectivo esperado en caja:</span>
              <span className="text-sm text-[#FFFBF4]">{formatMoney(corte.efectivoEsperado)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between font-extrabold">
              <span className="text-[#D8CFBC]">Efectivo físico contado:</span>
              <span className="text-sm text-[#FFFBF4]">{formatMoney(corte.efectivoContado)}</span>
            </div>
            <div className="mt-1.5 text-right font-extrabold">
              {corte.diferencia === 0 ? (
                <span className="text-emerald-300">Caja cuadrada exacta</span>
              ) : corte.diferencia > 0 ? (
                <span className="text-emerald-300">
                  Sobrante: +{formatMoney(corte.diferencia)}
                </span>
              ) : (
                <span className="text-amber-300">
                  Faltante: {formatMoney(corte.diferencia)}
                </span>
              )}
            </div>
          </div>
          {corte.note && (
            <div className="border-t border-[#565449]/40 pt-2 text-[#D8CFBC]">
              <span className="font-bold">Observación:</span> {corte.note}
            </div>
          )}
        </div>

        {/* Trabajos de este corte */}
        {corteJobs.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-xs font-bold text-[#D8CFBC]">
              Trabajos incluidos ({corteJobs.length})
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {corteJobs.map((job) => {
                const workerInfo = WORKERS[job.worker] || WORKERS.lizzy;
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between rounded-xl border border-[#565449]/50 bg-[#11120D] px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#FFFBF4]">{job.description}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#9E9A8B]">
                        <span>{workerInfo.shortName}</span>
                        <span>•</span>
                        <span>{formatTime(job.createdAt)}</span>
                        <span>•</span>
                        <span className="capitalize">{job.paymentMethod}</span>
                      </div>
                    </div>
                    <div className="ml-2 font-extrabold text-[#FFFBF4]">
                      {formatMoney(job.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#D8CFBC] px-4 py-2.5 text-xs font-extrabold text-[#11120D] active:scale-95"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Enviar corte por WhatsApp
          </button>
          {onRequestDelete && (
            <button
              type="button"
              onClick={() => onRequestDelete(corte.id)}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-300 transition active:scale-95 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar corte (Admin)
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}

