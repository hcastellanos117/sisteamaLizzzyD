import { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  History,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { WORKERS, formatDateTime, formatMoney, openWhatsApp } from '../utils/format';

export default function CortesView({ jobs, vales, gastos = [], cortes, quincena, onCloseCorte }) {
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [justClosed, setJustClosed] = useState(false);
  const [justSharedWa, setJustSharedWa] = useState(false);
  const [error, setError] = useState('');
  const [expandedCorteId, setExpandedCorteId] = useState(null);

  const unclosedJobs = jobs.filter((j) => !j.corteId);
  const unclosedVales = vales.filter((v) => !v.corteId);
  const unclosedGastos = gastos.filter((g) => !g.corteId);

  const currentTotals = unclosedJobs.reduce(
    (acc, j) => {
      acc.total += j.amount;
      acc.lizzyGross += j.lizzyAmount;
      acc.sandraGross += j.sandraAmount;
      if (j.paymentMethod === 'efectivo') acc.efectivo += j.amount;
      else acc.transferencia += j.amount;
      return acc;
    },
    { total: 0, lizzyGross: 0, sandraGross: 0, efectivo: 0, transferencia: 0 }
  );

  const valeTotals = unclosedVales.reduce(
    (acc, v) => {
      if (v.worker === 'lizzy') acc.lizzy += v.amount;
      else if (v.worker === 'sandra') acc.sandra += v.amount;
      acc.total += v.amount;
      return acc;
    },
    { lizzy: 0, sandra: 0, total: 0 }
  );

  const gastoTotal = unclosedGastos.reduce((sum, g) => sum + g.amount, 0);

  const lizzyNet = currentTotals.lizzyGross - valeTotals.lizzy;
  const sandraNet = currentTotals.sandraGross - valeTotals.sandra;
  const hasPending =
    unclosedJobs.length > 0 || unclosedVales.length > 0 || unclosedGastos.length > 0;

  const payoutSummary = [
    {
      name: 'Lizzy Dinora Viera',
      gross: currentTotals.lizzyGross,
      vales: valeTotals.lizzy,
      net: lizzyNet,
    },
    {
      name: 'Sandra Viera',
      gross: currentTotals.sandraGross,
      vales: valeTotals.sandra,
      net: sandraNet,
    },
  ];

  async function handleConfirmClose() {
    setError('');
    setClosing(true);
    try {
      await onCloseCorte();
      setConfirming(false);
      setJustClosed(true);
      setTimeout(() => setJustClosed(false), 3000);
    } catch (err) {
      setError(err.message || 'No se pudo cerrar la quincena.');
    } finally {
      setClosing(false);
    }
  }

  function shareCurrentQuincenaWhatsApp() {
    setJustSharedWa(true);
    setTimeout(() => setJustSharedWa(false), 2000);

    const lines = [
      `*SALON LIZZY & SANDRA - AVANCE QUINCENAL*`,
      `Período: ${quincena?.label || 'Quincena actual'}`,
      `Trabajos: ${unclosedJobs.length}`,
      `------------------------------`,
      `*Total generado:* ${formatMoney(currentTotals.total)}`,
      `------------------------------`,
      `*Lizzy Dinora Viera*`,
      `• Trabajos: ${formatMoney(currentTotals.lizzyGross)}`,
      `• Vales: -${formatMoney(valeTotals.lizzy)}`,
      `• *Neto a recibir:* ${formatMoney(lizzyNet)}`,
      `------------------------------`,
      `*Sandra Viera*`,
      `• Trabajos: ${formatMoney(currentTotals.sandraGross)}`,
      `• Vales: -${formatMoney(valeTotals.sandra)}`,
      `• *Neto a recibir:* ${formatMoney(sandraNet)}`,
    ];
    if (gastoTotal > 0) {
      lines.push(`------------------------------`);
      lines.push(`Gastos del salón: -${formatMoney(gastoTotal)}`);
    }
    openWhatsApp(lines.join('\n'));
  }

  function shareClosedCorteWhatsApp(corte) {
    const lizzyGross = corte.lizzyGross ?? corte.lizzyTotal + (corte.lizzyVales || 0);
    const sandraGross = corte.sandraGross ?? corte.sandraTotal + (corte.sandraVales || 0);
    const lines = [
      `*SALON LIZZY & SANDRA - CORTE QUINCENAL CERRADO*`,
      `Período: ${corte.periodLabel}`,
      `Cerrado: ${formatDateTime(corte.closedAt)}`,
      `Trabajos realizados: ${corte.jobCount}`,
      `------------------------------`,
      `*Total bruto servicios:* ${formatMoney(corte.totalAmount)}`,
      `------------------------------`,
      `*Lizzy Dinora Viera*`,
      `• Trabajos: ${formatMoney(lizzyGross)}`,
      `• Vales: -${formatMoney(corte.lizzyVales || 0)}`,
      `• *Neto a pagar:* ${formatMoney(corte.lizzyTotal)}`,
      `------------------------------`,
      `*Sandra Viera*`,
      `• Trabajos: ${formatMoney(sandraGross)}`,
      `• Vales: -${formatMoney(corte.sandraVales || 0)}`,
      `• *Neto a pagar:* ${formatMoney(corte.sandraTotal)}`,
    ];
    if (corte.gastosTotal > 0) {
      lines.push(`------------------------------`);
      lines.push(`Gastos del salón: -${formatMoney(corte.gastosTotal)}`);
    }
    lines.push(`------------------------------`);
    lines.push(`Efectivo cobrado: ${formatMoney(corte.efectivoTotal)}`);
    lines.push(`Transferencias: ${formatMoney(corte.transferenciaTotal)}`);
    openWhatsApp(lines.join('\n'));
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {quincena?.shouldAlert && (
        <div className="rounded-2xl border border-amber-400/60 bg-amber-500/15 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-amber-200">
                Es momento de realizar el corte quincenal
              </h3>
              <p className="mt-1 text-sm text-amber-100/80">
                Ya pasó la hora de corte (8:00 PM). Cierra el período para descontar los vales,
                guardar el resumen en el historial e iniciar la nueva quincena en cero.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-[#FFFBF4] sm:text-xl">
            {quincena?.label || 'Período actual'}
          </h2>
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#565449]/60 bg-[#11120D] px-3 py-1.5 text-xs font-medium text-[#D8CFBC]">
            <Clock className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            Cierre: 8:00 PM
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-[#D8CFBC]/30 bg-[#11120D] p-4 text-center">
          <div className="text-xs font-semibold text-[#D8CFBC]">
            Total generado ({unclosedJobs.length}{' '}
            {unclosedJobs.length === 1 ? 'trabajo' : 'trabajos'})
          </div>
          <div className="mt-1 text-4xl font-extrabold text-[#FFFBF4]">
            {formatMoney(currentTotals.total)}
          </div>
          {(valeTotals.total > 0 || gastoTotal > 0) && (
            <div className="mt-1.5 flex flex-wrap justify-center gap-3 text-xs font-semibold text-amber-300">
              {valeTotals.total > 0 && <span>Vales: -{formatMoney(valeTotals.total)}</span>}
              {gastoTotal > 0 && <span>Gastos salón: -{formatMoney(gastoTotal)}</span>}
            </div>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {payoutSummary.map((person) => (
            <div
              key={person.name}
              className="rounded-2xl border border-[#565449]/60 bg-[#11120D] p-4"
            >
              <div className="text-xs font-bold text-[#D8CFBC]">{person.name}</div>
              <div className="mt-2 space-y-1 text-xs text-[#9E9A8B]">
                <div className="flex justify-between">
                  <span>Trabajos:</span>
                  <span className="font-semibold text-[#FFFBF4]">{formatMoney(person.gross)}</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Vales descontados:</span>
                  <span className="font-semibold">-{formatMoney(person.vales)}</span>
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between border-t border-[#565449]/50 pt-2">
                <span className="text-xs font-bold text-[#D8CFBC]">Neto a pagar:</span>
                <span className="text-2xl font-extrabold text-[#FFFBF4]">
                  {formatMoney(person.net)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-xl border border-[#565449]/60 bg-[#11120D] px-3.5 py-2.5">
            <span className="flex items-center gap-1.5 text-xs text-[#9E9A8B]">
              <Banknote className="h-4 w-4 text-[#D8CFBC]" aria-hidden="true" />
              Efectivo
            </span>
            <span className="text-sm font-bold text-[#FFFBF4]">
              {formatMoney(currentTotals.efectivo)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#565449]/60 bg-[#11120D] px-3.5 py-2.5">
            <span className="flex items-center gap-1.5 text-xs text-[#9E9A8B]">
              <CreditCard className="h-4 w-4 text-[#D8CFBC]" aria-hidden="true" />
              Transfer.
            </span>
            <span className="text-sm font-bold text-[#FFFBF4]">
              {formatMoney(currentTotals.transferencia)}
            </span>
          </div>
        </div>

        <div className="mb-3">
          <button
            type="button"
            onClick={shareCurrentQuincenaWhatsApp}
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold transition active:scale-[0.98] sm:text-sm ${
              justSharedWa
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-[#565449] bg-[#11120D] text-[#D8CFBC] hover:text-[#FFFBF4]'
            }`}
          >
            {justSharedWa ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                Abriendo WhatsApp...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Enviar avance por WhatsApp
              </>
            )}
          </button>
        </div>

        {!confirming ? (
          <button
            type="button"
            disabled={!hasPending && !justClosed}
            onClick={() => setConfirming(true)}
            className={`flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold transition active:scale-[0.98] disabled:opacity-40 ${
              justClosed
                ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-200 opacity-100'
                : quincena?.shouldAlert
                ? 'bg-amber-400 text-[#11120D] shadow-lg hover:bg-amber-300'
                : 'bg-[#FFFBF4] text-[#11120D] hover:bg-[#D8CFBC]'
            }`}
          >
            {justClosed ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                Quincena cerrada y guardada
              </>
            ) : (
              <>
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                Cerrar quincena y guardar corte
              </>
            )}
          </button>
        ) : (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
            <p className="mb-3 text-center text-sm font-semibold text-amber-100">
              ¿Confirmas cerrar la quincena? Lizzy neto:{' '}
              <span className="font-extrabold text-[#FFFBF4]">{formatMoney(lizzyNet)}</span> •
              Sandra neto:{' '}
              <span className="font-extrabold text-[#FFFBF4]">{formatMoney(sandraNet)}</span>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={closing}
                onClick={() => setConfirming(false)}
                className="min-h-[44px] rounded-xl border border-[#565449] bg-[#11120D] py-3 text-sm font-bold text-[#D8CFBC]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={closing}
                onClick={handleConfirmClose}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-3 text-sm font-extrabold text-[#11120D] active:scale-95 disabled:opacity-50"
              >
                {closing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Cerrando...
                  </>
                ) : (
                  'Sí, cerrar corte'
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#D8CFBC]">
          <History className="h-4 w-4" aria-hidden="true" />
          Historial de cortes quincenales
        </h3>

        {cortes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#565449]/60 bg-[#1A1B15]/50 px-4 py-10 text-center text-sm text-[#9E9A8B]">
            Aún no hay cortes quincenales cerrados.
          </div>
        ) : (
          <div className="space-y-3">
            {cortes.map((corte) => {
              const isExpanded = expandedCorteId === corte.id;
              const corteJobs = jobs.filter((j) => j.corteId === corte.id);
              const corteVales = vales.filter((v) => v.corteId === corte.id);
              const corteGastos = gastos.filter((g) => g.corteId === corte.id);

              return (
                <div
                  key={corte.id}
                  className="rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-[#565449]/50 pb-3">
                    <div>
                      <div className="text-base font-extrabold text-[#FFFBF4]">
                        {corte.periodLabel}
                      </div>
                      <div className="mt-0.5 text-xs text-[#9E9A8B]">
                        Cerrado: {formatDateTime(corte.closedAt)} • {corte.jobCount} trabajos
                        {corte.valeCount > 0 ? ` • ${corte.valeCount} vales` : ''}
                        {corte.gastoCount > 0 ? ` • ${corte.gastoCount} gastos` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-[#9E9A8B]">Total bruto</div>
                      <div className="text-xl font-extrabold text-[#FFFBF4]">
                        {formatMoney(corte.totalAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
                    <div className="rounded-xl border border-[#565449]/40 bg-[#11120D] px-3 py-2.5">
                      <div className="text-xs font-semibold text-[#D8CFBC]">Lizzy Dinora Viera</div>
                      <div className="font-extrabold text-[#FFFBF4]">
                        {formatMoney(corte.lizzyTotal)}
                      </div>
                      {corte.lizzyVales > 0 && (
                        <div className="text-[11px] text-amber-300">
                          (Vales: -{formatMoney(corte.lizzyVales)})
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl border border-[#565449]/40 bg-[#11120D] px-3 py-2.5">
                      <div className="text-xs font-semibold text-[#D8CFBC]">Sandra Viera</div>
                      <div className="font-extrabold text-[#FFFBF4]">
                        {formatMoney(corte.sandraTotal)}
                      </div>
                      {corte.sandraVales > 0 && (
                        <div className="text-[11px] text-amber-300">
                          (Vales: -{formatMoney(corte.sandraVales)})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9E9A8B]">
                    <span>Efectivo: {formatMoney(corte.efectivoTotal)}</span>
                    <span>Transferencia: {formatMoney(corte.transferenciaTotal)}</span>
                    {corte.gastosTotal > 0 && (
                      <span className="text-amber-300">
                        Gastos salón: -{formatMoney(corte.gastosTotal)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#565449]/40 pt-3">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedCorteId(isExpanded ? null : corte.id)}
                      className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#565449] bg-[#11120D] px-3 py-1.5 text-xs font-bold text-[#D8CFBC] hover:text-[#FFFBF4] active:scale-95"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                          Ocultar detalle
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          Ver detalle ({corteJobs.length + corteVales.length + corteGastos.length})
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => shareClosedCorteWhatsApp(corte)}
                      className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[#D8CFBC] px-3.5 py-1.5 text-xs font-extrabold text-[#11120D] hover:bg-[#FFFBF4] active:scale-95"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      WhatsApp
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-[#565449]/40 pt-3">
                      {corteJobs.length === 0 &&
                      corteVales.length === 0 &&
                      corteGastos.length === 0 ? (
                        <div className="text-center text-xs text-[#9E9A8B]">
                          Sin movimientos detallados.
                        </div>
                      ) : (
                        <>
                          {corteJobs.map((job) => {
                            const workerInfo = WORKERS[job.worker] || WORKERS.lizzy;
                            return (
                              <div
                                key={job.id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-[#565449]/40 bg-[#11120D] px-3 py-2 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[#FFFBF4]">{job.description}</div>
                                  {job.clientReference && (
                                    <div className="text-[11px] text-[#D8CFBC]">
                                      Clienta / Ref: {job.clientReference}
                                    </div>
                                  )}
                                  <div className="text-[11px] text-[#9E9A8B]">
                                    {workerInfo.shortName} •{' '}
                                    {job.paymentMethod === 'efectivo'
                                      ? 'Efectivo'
                                      : 'Transferencia'}{' '}
                                    • {formatDateTime(job.createdAt)}
                                  </div>
                                </div>
                                <div className="font-extrabold text-[#FFFBF4]">
                                  {formatMoney(job.amount)}
                                </div>
                              </div>
                            );
                          })}

                          {corteVales.map((vale) => (
                            <div
                              key={vale.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-[#11120D] px-3 py-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-amber-200">
                                  Vale: {vale.worker === 'lizzy' ? 'Lizzy' : 'Sandra'}
                                  {vale.note ? ` (${vale.note})` : ''}
                                </div>
                                <div className="text-[11px] text-[#9E9A8B]">
                                  {vale.paymentMethod === 'efectivo'
                                    ? 'Efectivo'
                                    : 'Transferencia'}{' '}
                                  • {formatDateTime(vale.createdAt)}
                                </div>
                              </div>
                              <div className="font-extrabold text-amber-300">
                                -{formatMoney(vale.amount)}
                              </div>
                            </div>
                          ))}

                          {corteGastos.map((gasto) => (
                            <div
                              key={gasto.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-[#565449]/40 bg-[#11120D] px-3 py-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-[#D8CFBC]">
                                  Gasto salón: {gasto.description}
                                </div>
                                <div className="text-[11px] text-[#9E9A8B]">
                                  {gasto.paymentMethod === 'efectivo'
                                    ? 'Efectivo'
                                    : 'Transferencia'}{' '}
                                  • {formatDateTime(gasto.createdAt)}
                                </div>
                              </div>
                              <div className="font-extrabold text-[#FFFBF4]">
                                -{formatMoney(gasto.amount)}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
