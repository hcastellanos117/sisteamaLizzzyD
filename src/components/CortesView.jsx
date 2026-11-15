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
  const sandraNet = currentTotals.sandraGross - valeTotals.sandra - gastoTotal;
  const hasPending =
    unclosedJobs.length > 0 || unclosedVales.length > 0 || unclosedGastos.length > 0;

  const payoutSummary = [
    {
      name: 'Lizzy Dinora Viera',
      gross: currentTotals.lizzyGross,
      vales: valeTotals.lizzy,
      gastos: 0,
      net: lizzyNet,
      color: '#E8B4B8',
      cardBorder: 'border-[#E8B4B8]/30',
      cardBg: 'bg-[#1D1618]',
    },
    {
      name: 'Sandra Viera',
      gross: currentTotals.sandraGross,
      vales: valeTotals.sandra,
      gastos: gastoTotal,
      net: sandraNet,
      color: '#A3C9A8',
      cardBorder: 'border-[#A3C9A8]/30',
      cardBg: 'bg-[#162018]',
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
      `*DINORA BEAUTY NAILS - AVANCE QUINCENAL*`,
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
      ...(gastoTotal > 0 ? [`• Gastos salón (deducidos): -${formatMoney(gastoTotal)}`] : []),
      `• *Neto a recibir:* ${formatMoney(sandraNet)}`,
    ];
    if (gastoTotal > 0) {
      lines.push(`------------------------------`);
      lines.push(`Gastos del salón totales: -${formatMoney(gastoTotal)} (descontados a Sandra)`);
    }
    openWhatsApp(lines.join('\n'));
  }

  function shareClosedCorteWhatsApp(corte) {
    const lizzyGross = corte.lizzyGross ?? corte.lizzyTotal + (corte.lizzyVales || 0);
    const sandraGross =
      corte.sandraGross ??
      corte.sandraTotal + (corte.sandraVales || 0) + (corte.gastosTotal || 0);
    const lines = [
      `*DINORA BEAUTY NAILS - CORTE QUINCENAL CERRADO*`,
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
      ...(corte.gastosTotal > 0 ? [`• Gastos salón (deducidos): -${formatMoney(corte.gastosTotal)}`] : []),
      `• *Neto a pagar:* ${formatMoney(corte.sandraTotal)}`,
    ];
    if (corte.gastosTotal > 0) {
      lines.push(`------------------------------`);
      lines.push(`Gastos del salón totales: -${formatMoney(corte.gastosTotal)} (descontados a Sandra)`);
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

      <section className="rounded-3xl border border-[#2D2A22] bg-[#161511] p-5 sm:p-7 shadow-lg space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#25231C]">
          <h2 className="text-lg font-extrabold text-[#FFFBF4] sm:text-xl">
            {quincena?.label || 'Período actual'}
          </h2>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#25231C] px-3 py-1 text-xs font-semibold text-[#D8CFBC]">
            <Clock className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            Cierre automático: 8:00 PM
          </div>
        </div>

        {/* Hero de Total Quincenal */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-5 border-b border-[#25231C]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#A59F91]">
              Total bruto generado en servicios
            </span>
            <div className="mt-1 text-4xl sm:text-5xl font-extrabold tracking-tight text-[#FFFBF4]">
              {formatMoney(currentTotals.total)}
            </div>
          </div>
          <div className="text-xs text-[#7D786D]">
            {unclosedJobs.length} {unclosedJobs.length === 1 ? 'servicio registrado' : 'servicios registrados'}
          </div>
        </div>

        {/* Liquidación por Colaboradora (Lizzy y Sandra) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {payoutSummary.map((person) => (
            <div
              key={person.name}
              className={`rounded-2xl border ${person.cardBorder} ${person.cardBg} p-5 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold" style={{ color: person.color }}>{person.name}</span>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: person.color }} aria-hidden="true" />
              </div>
              <div className="space-y-1.5 text-xs text-[#9E9A8B]">
                <div className="flex justify-between">
                  <span>Trabajos realizados:</span>
                  <span className="font-semibold text-[#FFFBF4]">{formatMoney(person.gross)}</span>
                </div>
                <div className="flex justify-between text-[#E09F95]">
                  <span>Vales descontados:</span>
                  <span className="font-semibold">-{formatMoney(person.vales)}</span>
                </div>
                {person.gastos > 0 && (
                  <div className="flex justify-between text-[#9DBAD8]">
                    <span>Gastos salón descontados:</span>
                    <span className="font-semibold">-{formatMoney(person.gastos)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D8CFBC]">Neto a recibir:</span>
                <span className="text-3xl font-extrabold text-[#FFFBF4]">
                  {formatMoney(person.net)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Flujo de pagos acumulado */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center justify-between rounded-2xl bg-[#0E0E0A] border border-[#25231C] px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-bold text-[#A59F91]">
              <Banknote className="h-4 w-4 text-[#A3C9A8]" aria-hidden="true" />
              Efectivo cobrado
            </span>
            <span className="text-sm font-extrabold text-[#FFFBF4]">
              {formatMoney(currentTotals.efectivo)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#0E0E0A] border border-[#25231C] px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-bold text-[#A59F91]">
              <CreditCard className="h-4 w-4 text-[#9DBAD8]" aria-hidden="true" />
              Transferencias
            </span>
            <span className="text-sm font-extrabold text-[#FFFBF4]">
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

      {/* Historial de Cortes Quincenales (Sin tarjetas anidadas) */}
      <section className="rounded-3xl border border-[#2D2A22] bg-[#161511] overflow-hidden shadow-lg">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#25231C]">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A59F91]">
            <History className="h-4 w-4 text-[#E4C59E]" aria-hidden="true" />
            Historial de quincenas anteriores
          </h3>
          <span className="rounded-full bg-[#25231C] px-3 py-1 text-xs font-semibold text-[#D8CFBC]">
            {cortes.length} {cortes.length === 1 ? 'período cerrado' : 'períodos cerrados'}
          </span>
        </div>

        {cortes.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[#7D786D]">
            Aún no hay cortes quincenales cerrados.
          </div>
        ) : (
          <div className="divide-y divide-[#222019]">
            {cortes.map((corte) => {
              const isExpanded = expandedCorteId === corte.id;
              const corteJobs = jobs.filter((j) => j.corteId === corte.id);
              const corteVales = vales.filter((v) => v.corteId === corte.id);
              const corteGastos = gastos.filter((g) => g.corteId === corte.id);

              return (
                <div key={corte.id} className="p-4 sm:p-5 transition hover:bg-[#1A1914]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-[#FFFBF4]">
                        {corte.periodLabel}
                      </div>
                      <div className="mt-0.5 text-xs text-[#7D786D]">
                        Cerrado: {formatDateTime(corte.closedAt)} • {corte.jobCount} servicios
                        {corte.valeCount > 0 ? ` • ${corte.valeCount} vales` : ''}
                        {corte.gastoCount > 0 ? ` • ${corte.gastoCount} gastos` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#7D786D]">Total bruto</div>
                      <div className="text-xl font-extrabold text-[#FFFBF4]">
                        {formatMoney(corte.totalAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-[#1C181A] p-3 border border-[#E8B4B8]/20">
                      <div className="text-xs font-bold text-[#E8B4B8]">Lizzy Dinora</div>
                      <div className="font-extrabold text-[#FFFBF4] mt-0.5">
                        {formatMoney(corte.lizzyTotal)}
                      </div>
                      {corte.lizzyVales > 0 && (
                        <div className="text-[11px] text-[#E09F95]">
                          (Vales: -{formatMoney(corte.lizzyVales)})
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl bg-[#162018] p-3 border border-[#A3C9A8]/20">
                      <div className="text-xs font-bold text-[#A3C9A8]">Sandra Viera</div>
                      <div className="font-extrabold text-[#FFFBF4] mt-0.5">
                        {formatMoney(corte.sandraTotal)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px]">
                        {corte.sandraVales > 0 && (
                          <span className="text-[#E09F95]">
                            (Vales: -{formatMoney(corte.sandraVales)})
                          </span>
                        )}
                        {corte.gastosTotal > 0 && (
                          <span className="text-[#9DBAD8]">
                            (Gastos: -{formatMoney(corte.gastosTotal)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7D786D]">
                    <span>Efectivo: {formatMoney(corte.efectivoTotal)} • Transf: {formatMoney(corte.transferenciaTotal)}</span>
                    {corte.gastosTotal > 0 && (
                      <span className="text-[#9DBAD8]">
                        Gastos salón deducidos: -{formatMoney(corte.gastosTotal)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[#25231C] pt-3">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedCorteId(isExpanded ? null : corte.id)}
                      className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#222019] px-3 py-1.5 text-xs font-bold text-[#D8CFBC] hover:text-[#FFFBF4] active:scale-95"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                          Ocultar desglose
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          Ver desglose ({corteJobs.length + corteVales.length + corteGastos.length})
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
