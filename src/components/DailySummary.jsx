import { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  Banknote,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  MessageCircle,
  Pencil,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import {
  WORKERS,
  dateToTimeString,
  formatDateKeyLabel,
  formatDateTime,
  formatMoney,
  formatTime,
  openWhatsApp,
  timeStringToDate,
  toLocalDateKey,
} from '../utils/format';
import CorteDetailModal from './CorteDetailModal';
import EditJobModal from './EditJobModal';
import SecurityPinModal from './SecurityPinModal';

function shiftDateKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return toLocalDateKey(dt);
}

const FILTER_TABS = [
  { id: 'day', label: 'Por día' },
  { id: 'allDays', label: 'Todos los días' },
];

export default function DailySummary({
  jobs,
  vales,
  gastos = [],
  cortesDiarios = [],
  cajaBases = {},
  cajaSesion,
  onUpdateJob,
  onDeleteJob,
  onCreateCorteDiario,
  onDeleteCorteDiario,
  onAperturarCaja,
}) {
  const todayKey = toLocalDateKey(new Date());
  const isCajaOpen = cajaSesion?.status === 'open';
  const [aperturaBaseInput, setAperturaBaseInput] = useState('');
  const [aperturandoCaja, setAperturandoCaja] = useState(false);
  const [aperturaError, setAperturaError] = useState('');

  const [filterType, setFilterType] = useState('day');
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const [editingJob, setEditingJob] = useState(null);
  const [selectedCorteModal, setSelectedCorteModal] = useState(null);

  const [securityModal, setSecurityModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirmAction: null,
  });

  // Formulario de Corte de Caja Manual
  const [manualCutOpen, setManualCutOpen] = useState(false);
  const [manualCutLabel, setManualCutLabel] = useState('Corte #1');
  const [manualCutOpenTime, setManualCutOpenTime] = useState('08:00');
  const [manualCutCloseTime, setManualCutCloseTime] = useState('14:00');
  const [manualCutScope, setManualCutScope] = useState('shift');
  const [countedCashInput, setCountedCashInput] = useState('');
  const [manualCutNote, setManualCutNote] = useState('');
  const [savingManualCut, setSavingManualCut] = useState(false);
  const [justSavedCut, setJustSavedCut] = useState(false);
  const [justSharedWa, setJustSharedWa] = useState(false);

  const currentDayBase = isCajaOpen
    ? Number(cajaSesion?.baseAmount ?? cajaBases[selectedDate] ?? 0) || 0
    : 0;

  // Cortes ya guardados para la fecha seleccionada
  const existingCortesSelectedDate = useMemo(() => {
    return (cortesDiarios || [])
      .filter((c) => (c.dateKey || toLocalDateKey(c.closedAt)) === selectedDate)
      .sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt));
  }, [cortesDiarios, selectedDate]);

  // Abrir modal de nuevo corte inicializando apertura y cierre según turno activo
  function handleOpenManualCut() {
    const nextNum = existingCortesSelectedDate.length + 1;
    setManualCutLabel(`Corte #${nextNum}`);
    setManualCutScope('shift');

    if (cajaSesion?.openedAt) {
      setManualCutOpenTime(dateToTimeString(cajaSesion.openedAt));
    } else if (existingCortesSelectedDate.length > 0) {
      const lastCut = existingCortesSelectedDate[existingCortesSelectedDate.length - 1];
      setManualCutOpenTime(dateToTimeString(lastCut.closedAt));
    } else {
      const dayJobs = jobs.filter(
        (j) => toLocalDateKey(j.createdAt) === selectedDate && !j.corteDiarioId
      );
      if (dayJobs.length > 0) {
        const sorted = [...dayJobs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setManualCutOpenTime(dateToTimeString(sorted[0].createdAt));
      } else {
        setManualCutOpenTime('08:00');
      }
    }

    setManualCutCloseTime(dateToTimeString(new Date()));
    setCountedCashInput('');
    setManualCutNote('');
    setManualCutOpen(true);
  }

  // Previsualización y cálculo en tiempo real del nuevo corte
  const cutPreview = useMemo(() => {
    if (!manualCutOpen) {
      return {
        jobs: [],
        vales: [],
        gastos: [],
        total: 0,
        lizzy: 0,
        sandra: 0,
        efectivo: 0,
        transferencia: 0,
        valesTotal: 0,
        valesEfectivo: 0,
        gastosTotal: 0,
        gastosEfectivo: 0,
        efectivoEsperado: 0,
      };
    }

    const openDateTime = timeStringToDate(manualCutOpenTime, selectedDate);
    const closeDateTime = timeStringToDate(manualCutCloseTime, selectedDate);
    closeDateTime.setSeconds(59, 999);

    const matchesScope = (item) => {
      const key = toLocalDateKey(item.createdAt);
      if (key !== selectedDate) return false;
      if (manualCutScope === 'allDay') return true;
      if (item.corteDiarioId) return false;
      const dt = new Date(item.createdAt);
      return dt >= openDateTime && dt <= closeDateTime;
    };

    const cJobs = jobs.filter(matchesScope);
    const cVales = vales.filter(matchesScope);
    const cGastos = gastos.filter(matchesScope);

    let total = 0;
    let lizzy = 0;
    let sandra = 0;
    let efectivo = 0;
    let transf = 0;
    for (const j of cJobs) {
      total += j.amount;
      lizzy += j.lizzyAmount;
      sandra += j.sandraAmount;
      if (j.paymentMethod === 'efectivo') efectivo += j.amount;
      else transf += j.amount;
    }

    let valesTotal = 0;
    let valesEfectivo = 0;
    for (const v of cVales) {
      valesTotal += v.amount;
      if (v.paymentMethod === 'efectivo') valesEfectivo += v.amount;
    }

    let gastosTotal = 0;
    let gastosEfectivo = 0;
    for (const g of cGastos) {
      gastosTotal += g.amount;
      if (g.paymentMethod === 'efectivo') gastosEfectivo += g.amount;
    }

    const baseAmount = filterType === 'day' ? currentDayBase : 0;
    const esperado = baseAmount + efectivo - valesEfectivo - gastosEfectivo;

    return {
      jobs: cJobs,
      vales: cVales,
      gastos: cGastos,
      total,
      lizzy,
      sandra,
      efectivo,
      transferencia: transf,
      valesTotal,
      valesEfectivo,
      gastosTotal,
      gastosEfectivo,
      efectivoEsperado: esperado,
    };
  }, [
    manualCutOpen,
    manualCutScope,
    manualCutOpenTime,
    manualCutCloseTime,
    selectedDate,
    jobs,
    vales,
    gastos,
    filterType,
    currentDayBase,
  ]);

  const cutCountedNumeric =
    countedCashInput.trim() === ''
      ? cutPreview.efectivoEsperado
      : parseFloat(countedCashInput);
  const cutCashDiff = Number.isFinite(cutCountedNumeric)
    ? Math.round((cutCountedNumeric - cutPreview.efectivoEsperado) * 100) / 100
    : 0;

  const filteredJobs = useMemo(() => {
    if (filterType !== 'day') return jobs;
    if (!isCajaOpen) return [];
    return jobs.filter((j) => toLocalDateKey(j.createdAt) === selectedDate && !j.corteDiarioId);
  }, [jobs, filterType, selectedDate, isCajaOpen]);

  const filteredVales = useMemo(() => {
    if (filterType !== 'day') return vales;
    if (!isCajaOpen) return [];
    return vales.filter((v) => toLocalDateKey(v.createdAt) === selectedDate && !v.corteDiarioId);
  }, [vales, filterType, selectedDate, isCajaOpen]);

  const filteredGastos = useMemo(() => {
    if (filterType !== 'day') return gastos;
    if (!isCajaOpen) return [];
    return gastos.filter((g) => toLocalDateKey(g.createdAt) === selectedDate && !g.corteDiarioId);
  }, [gastos, filterType, selectedDate, isCajaOpen]);

  const filteredCortesDiarios = useMemo(
    () =>
      cortesDiarios.filter((c) => {
        const key = c.dateKey || toLocalDateKey(c.closedAt);
        return key === selectedDate;
      }),
    [cortesDiarios, selectedDate]
  );

  const totals = useMemo(() => {
    const res = {
      total: 0,
      lizzy: 0,
      sandra: 0,
      efectivo: 0,
      transferencia: 0,
      valesEfectivo: 0,
      valesTransferencia: 0,
      valesLizzy: 0,
      valesSandra: 0,
      gastosEfectivo: 0,
      gastosTransferencia: 0,
      gastosTotal: 0,
    };
    for (const j of filteredJobs) {
      res.total += j.amount;
      res.lizzy += j.lizzyAmount;
      res.sandra += j.sandraAmount;
      if (j.paymentMethod === 'efectivo') res.efectivo += j.amount;
      else res.transferencia += j.amount;
    }
    for (const v of filteredVales) {
      if (v.worker === 'lizzy') res.valesLizzy += v.amount;
      else res.valesSandra += v.amount;
      if (v.paymentMethod === 'efectivo') res.valesEfectivo += v.amount;
      else res.valesTransferencia += v.amount;
    }
    for (const g of filteredGastos) {
      res.gastosTotal += g.amount;
      if (g.paymentMethod === 'efectivo') res.gastosEfectivo += g.amount;
      else res.gastosTransferencia += g.amount;
    }
    return res;
  }, [filteredJobs, filteredVales, filteredGastos]);

  // Lista detallada de cortes y turnos para "Todos los días"
  const allDaysList = useMemo(() => {
    const datesSet = new Set();
    jobs.forEach((j) => datesSet.add(toLocalDateKey(j.createdAt)));
    vales.forEach((v) => datesSet.add(toLocalDateKey(v.createdAt)));
    gastos.forEach((g) => datesSet.add(toLocalDateKey(g.createdAt)));
    cortesDiarios.forEach((c) => datesSet.add(c.dateKey || toLocalDateKey(c.closedAt)));

    const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

    const result = [];

    for (const dKey of sortedDates) {
      const dayCortes = cortesDiarios
        .filter((c) => (c.dateKey || toLocalDateKey(c.closedAt)) === dKey)
        .sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt));

      const dayJobs = jobs.filter((j) => toLocalDateKey(j.createdAt) === dKey);
      const dayVales = vales.filter((v) => toLocalDateKey(v.createdAt) === dKey);
      const dayGastos = gastos.filter((g) => toLocalDateKey(g.createdAt) === dKey);

      if (dayCortes.length === 0) {
        // Solo mostrar turno en curso si la caja está ABIERTA y hay movimientos activos
        if (isCajaOpen && (dayJobs.length > 0 || dayVales.length > 0 || dayGastos.length > 0)) {
          let total = 0, lizzy = 0, sandra = 0;
          dayJobs.forEach((j) => {
            total += j.amount;
            lizzy += j.lizzyAmount;
            sandra += j.sandraAmount;
          });
          const vTotal = dayVales.reduce((sum, v) => sum + v.amount, 0);
          const gTotal = dayGastos.reduce((sum, g) => sum + g.amount, 0);

          const sortedJobs = [...dayJobs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const earliestTime = sortedJobs[0] ? sortedJobs[0].createdAt : null;

          result.push({
            type: 'day_summary',
            key: `day_${dKey}`,
            dateKey: dKey,
            title: formatDateKeyLabel(dKey),
            openedAt: earliestTime,
            closedAt: null,
            total,
            lizzy,
            sandra,
            jobCount: dayJobs.length,
            valesTotal: vTotal,
            gastosTotal: gTotal,
          });
        }
      } else {
        // Si hay cortes guardados en este día, agregar cada corte
        dayCortes.forEach((corte, idx) => {
          result.push({
            type: 'saved_corte',
            key: corte.id || `corte_${dKey}_${idx}`,
            dateKey: dKey,
            corte,
            title: `${corte.corteLabel || `Corte #${corte.corteNumber || idx + 1}`} • ${formatDateKeyLabel(dKey)}`,
            openedAt: corte.openedAt,
            closedAt: corte.closedAt,
            total: corte.totalServicios,
            lizzy: corte.lizzyServicios,
            sandra: corte.sandraServicios,
            jobCount: corte.jobCount,
            valesTotal: corte.valesTotal,
            gastosTotal: corte.gastosTotal,
          });
        });

        // Verificar si hay trabajos registrados que aún no se hayan cortado (turno en curso)
        const lastCorte = dayCortes[dayCortes.length - 1];
        const openJobs = dayJobs.filter((j) => !j.corteDiarioId);

        if (isCajaOpen && openJobs.length > 0) {
          let openTotal = 0, openLizzy = 0, openSandra = 0;
          openJobs.forEach((j) => {
            openTotal += j.amount;
            openLizzy += j.lizzyAmount;
            openSandra += j.sandraAmount;
          });

          result.push({
            type: 'open_shift',
            key: `open_${dKey}`,
            dateKey: dKey,
            title: `Turno en curso • ${formatDateKeyLabel(dKey)}`,
            openedAt: lastCorte.closedAt,
            closedAt: null,
            total: openTotal,
            lizzy: openLizzy,
            sandra: openSandra,
            jobCount: openJobs.length,
            valesTotal: 0,
            gastosTotal: 0,
          });
        }
      }
    }

    return result;
  }, [jobs, vales, gastos, cortesDiarios, isCajaOpen]);

  function handleRequestDeleteJob(id) {
    setSecurityModal({
      isOpen: true,
      title: 'Eliminar Trabajo',
      description: 'Ingresa la contraseña de administradora para eliminar este trabajo.',
      onConfirmAction: (pwd) => onDeleteJob(id, pwd),
    });
  }

  function handleRequestDeleteCorteDiario(id) {
    setSecurityModal({
      isOpen: true,
      title: 'Eliminar Corte de Caja',
      description: 'Ingresa la contraseña de administradora para eliminar este corte de caja guardado.',
      onConfirmAction: async (pwd) => {
        await onDeleteCorteDiario(id, pwd);
        setManualCutOpen(false);
        setJustSavedCut(false);
        if (selectedCorteModal && selectedCorteModal.id === id) {
          setSelectedCorteModal(null);
        }
      },
    });
  }

  const baseApplies = filterType === 'day' && isCajaOpen ? currentDayBase : 0;
  const efectivoEnCaja =
    baseApplies + totals.efectivo - totals.valesEfectivo - totals.gastosEfectivo;
  const totalValesPeriodo = totals.valesLizzy + totals.valesSandra;

  async function handleSaveManualCut(e) {
    e.preventDefault();
    setSavingManualCut(true);

    const openDateTime = timeStringToDate(manualCutOpenTime, selectedDate);
    const closeDateTime = timeStringToDate(manualCutCloseTime, selectedDate);

    try {
      await onCreateCorteDiario({
        dateKey: filterType === 'day' ? selectedDate : todayKey,
        periodLabel: formatDateKeyLabel(selectedDate),
        openedAt: openDateTime.toISOString(),
        closedAt: closeDateTime.toISOString(),
        corteNumber: existingCortesSelectedDate.length + 1,
        corteLabel: manualCutLabel.trim() || `Corte #${existingCortesSelectedDate.length + 1}`,
        baseAmount: baseApplies,
        totalServicios: cutPreview.total,
        lizzyServicios: cutPreview.lizzy,
        sandraServicios: cutPreview.sandra,
        valesTotal: cutPreview.valesTotal,
        gastosTotal: cutPreview.gastosTotal,
        efectivoCobrado: cutPreview.efectivo,
        efectivoEsperado: cutPreview.efectivoEsperado,
        efectivoContado: Number.isFinite(cutCountedNumeric)
          ? cutCountedNumeric
          : cutPreview.efectivoEsperado,
        transferenciaTotal: cutPreview.transferencia,
        jobCount: cutPreview.jobs.length,
        jobIds: cutPreview.jobs.map((j) => j.id),
        valesIds: cutPreview.vales.map((v) => v.id),
        gastosIds: cutPreview.gastos.map((g) => g.id),
        note: manualCutNote.trim(),
      });
      setManualCutOpen(false);
      setManualCutNote('');
      setAperturaBaseInput('');
      setJustSavedCut(true);
      setTimeout(() => setJustSavedCut(false), 2600);
    } finally {
      setSavingManualCut(false);
    }
  }

  function handleShareWhatsApp() {
    setJustSharedWa(true);
    setTimeout(() => setJustSharedWa(false), 2000);

    const periodTitle = formatDateKeyLabel(selectedDate);

    const lines = [
      `*DINORA BEAUTY NAILS - CORTE DE CAJA*`,
      `Fecha: ${periodTitle}`,
      `Trabajos realizados: ${filteredJobs.length}`,
      `------------------------------`,
      `*Total servicios:* ${formatMoney(totals.total)}`,
      `• Lizzy (servicios): ${formatMoney(totals.lizzy)}`,
      `• Sandra (servicios): ${formatMoney(totals.sandra)}`,
    ];

    if (totalValesPeriodo > 0) {
      lines.push(`------------------------------`);
      lines.push(`*Vales retirados:* -${formatMoney(totalValesPeriodo)}`);
      if (totals.valesLizzy > 0) lines.push(`• Vales Lizzy: -${formatMoney(totals.valesLizzy)}`);
      if (totals.valesSandra > 0) lines.push(`• Vales Sandra: -${formatMoney(totals.valesSandra)}`);
    }

    if (totals.gastosTotal > 0) {
      lines.push(`*Gastos del salón:* -${formatMoney(totals.gastosTotal)}`);
    }

    lines.push(`------------------------------`);
    if (currentDayBase > 0) {
      lines.push(`Base inicial en caja: ${formatMoney(currentDayBase)}`);
    }
    lines.push(`Efectivo cobrado: ${formatMoney(totals.efectivo)}`);
    lines.push(`*Efectivo físico en caja:* ${formatMoney(efectivoEnCaja)}`);
    lines.push(`Transferencias: ${formatMoney(totals.transferencia)}`);

    openWhatsApp(lines.join('\n'));
  }

  return (
    <div className="space-y-4">
      {/* Selector de tipo de filtro */}
      <section className="rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4">
        <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl border border-[#565449]/50 bg-[#11120D] p-1">
          {FILTER_TABS.map((tab) => {
            const active = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilterType(tab.id)}
                className={`flex min-h-[38px] items-center justify-center gap-1 rounded-lg py-2 text-xs font-extrabold transition active:scale-95 ${
                  active ? 'bg-[#D8CFBC] text-[#11120D]' : 'text-[#D8CFBC]'
                }`}
              >
                {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {filterType === 'day' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateKey(selectedDate, -1))}
              className="min-h-[42px] rounded-xl border border-[#565449] bg-[#11120D] p-2.5 text-[#D8CFBC] hover:text-[#FFFBF4] active:scale-95"
              aria-label="Día anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <label htmlFor="filter-single-date" className="sr-only">
              Seleccionar fecha
            </label>
            <input
              id="filter-single-date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="min-h-[42px] min-w-0 flex-1 rounded-xl border border-[#565449] bg-[#11120D] px-3 py-2 text-sm font-semibold text-[#FFFBF4] focus:border-[#D8CFBC]"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateKey(selectedDate, 1))}
              className="min-h-[42px] rounded-xl border border-[#565449] bg-[#11120D] p-2.5 text-[#D8CFBC] hover:text-[#FFFBF4] active:scale-95"
              aria-label="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {selectedDate !== todayKey && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayKey)}
                className="min-h-[42px] rounded-xl bg-[#D8CFBC] px-3.5 py-2 text-xs font-extrabold text-[#11120D] active:scale-95"
              >
                Hoy
              </button>
            )}
          </div>
        )}
      </section>

      {/* Pestaña: Todos los días (Lista de Cortes Diarios) */}
      {filterType === 'allDays' ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#D8CFBC]">
              Cortes diarios por fecha ({allDaysList.length})
            </h2>
            <span className="text-xs text-[#9E9A8B]">Toca cualquier corte para ver detalle</span>
          </div>

          {allDaysList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#565449]/60 bg-[#1A1B15]/50 px-4 py-10 text-center text-sm text-[#9E9A8B]">
              Aún no hay movimientos registrados.
            </div>
          ) : (
            allDaysList.map((item) => {
              const isToday = item.dateKey === todayKey;

              if (item.type === 'saved_corte') {
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedCorteModal(item.corte)}
                    className="w-full rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4 text-left transition hover:border-[#D8CFBC]/60 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold text-[#FFFBF4]">
                          {isToday ? 'Hoy, ' : ''}
                          {item.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D8CFBC]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#D8CFBC]" aria-hidden="true" />
                            Apertura: {formatTime(item.openedAt)}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                            Corte: {formatTime(item.closedAt)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-[#9E9A8B]">
                          {item.jobCount} {item.jobCount === 1 ? 'trabajo' : 'trabajos'} • Lizzy:{' '}
                          {formatMoney(item.lizzy)} • Sandra: {formatMoney(item.sandra)}
                        </div>
                        {(item.valesTotal > 0 || item.gastosTotal > 0) && (
                          <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-amber-300">
                            {item.valesTotal > 0 && (
                              <span>Vales: -{formatMoney(item.valesTotal)}</span>
                            )}
                            {item.gastosTotal > 0 && (
                              <span>Gastos: -{formatMoney(item.gastosTotal)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-[#FFFBF4]">
                          {formatMoney(item.total)}
                        </div>
                        <div className="text-xs font-semibold text-[#D8CFBC]">Ver detalle</div>
                      </div>
                    </div>
                  </button>
                );
              }

              if (item.type === 'open_shift') {
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(item.dateKey);
                      setFilterType('day');
                    }}
                    className="w-full rounded-2xl border border-dashed border-[#565449] bg-[#1A1B15] p-4 text-left transition hover:border-[#D8CFBC]/60 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold text-[#FFFBF4]">
                          {isToday ? 'Hoy, ' : ''}
                          {item.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300">
                          <span>Apertura: {formatTime(item.openedAt)}</span>
                          <span>•</span>
                          <span>Corte: En curso (Sin cerrar)</span>
                        </div>
                        <div className="mt-1 text-xs text-[#9E9A8B]">
                          {item.jobCount} {item.jobCount === 1 ? 'trabajo' : 'trabajos'} • Lizzy:{' '}
                          {formatMoney(item.lizzy)} • Sandra: {formatMoney(item.sandra)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-[#FFFBF4]">
                          {formatMoney(item.total)}
                        </div>
                        <div className="text-xs font-semibold text-[#D8CFBC]">Ver detalle</div>
                      </div>
                    </div>
                  </button>
                );
              }

              // day_summary (día sin cortes manuales cerrados)
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(item.dateKey);
                    setFilterType('day');
                  }}
                  className="w-full rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4 text-left transition hover:border-[#D8CFBC]/60 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-[#FFFBF4]">
                        {isToday ? 'Hoy, ' : ''}
                        {item.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D8CFBC]">
                        <span>Apertura: {item.openedAt ? formatTime(item.openedAt) : '08:00 AM'}</span>
                        <span>•</span>
                        <span className="text-[#9E9A8B]">Corte: En curso</span>
                      </div>
                      <div className="mt-1 text-xs text-[#9E9A8B]">
                        {item.jobCount} {item.jobCount === 1 ? 'trabajo' : 'trabajos'} • Lizzy:{' '}
                        {formatMoney(item.lizzy)} • Sandra: {formatMoney(item.sandra)}
                      </div>
                      {(item.valesTotal > 0 || item.gastosTotal > 0) && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-amber-300">
                          {item.valesTotal > 0 && (
                            <span>Vales: -{formatMoney(item.valesTotal)}</span>
                          )}
                          {item.gastosTotal > 0 && (
                            <span>Gastos: -{formatMoney(item.gastosTotal)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-[#FFFBF4]">
                        {formatMoney(item.total)}
                      </div>
                      <div className="text-xs font-semibold text-[#D8CFBC]">Ver detalle</div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </section>
      ) : (
        <>
          {/* Pestaña: Por día */}
          <section className="rounded-3xl border border-[#2D2A22] bg-[#161511] p-5 sm:p-7 shadow-lg space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#25231C]">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-[#FFFBF4] sm:text-lg">
                <Calendar className="h-4 w-4 text-[#E4C59E]" aria-hidden="true" />
                {formatDateKeyLabel(selectedDate)}
              </h2>
              <span className="rounded-full bg-[#25231C] px-3 py-1 text-xs font-semibold text-[#D8CFBC]">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'servicio' : 'servicios'}
              </span>
            </div>

            {/* Si la caja está cerrada, mostrar tarjeta limpia para aperturar caja */}
            {!isCajaOpen ? (
              <div className="rounded-2xl border border-amber-400/40 bg-[#0E0E0A] p-5 text-center sm:p-7">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                  <Lock className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-[#FFFBF4]">
                  Caja cerrada {existingCortesSelectedDate.length > 0 ? '• Corte de caja realizado' : '• No iniciada'}
                </h3>
                <p className="mt-1 text-xs text-[#D8CFBC]">
                  {existingCortesSelectedDate.length > 0
                    ? 'El corte anterior ya fue cerrado y los cobros fueron guardados. Ingresa el monto principal para aperturar la caja del nuevo turno:'
                    : 'Para iniciar la jornada, apertura la caja con el monto inicial en efectivo:'}
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAperturaError('');
                    const num = parseFloat(aperturaBaseInput);
                    if (!Number.isFinite(num) || num < 0) {
                      setAperturaError('Ingresa un monto inicial válido.');
                      return;
                    }
                    setAperturandoCaja(true);
                    try {
                      await onAperturarCaja(num, selectedDate);
                      setAperturaBaseInput('');
                    } catch (err) {
                      setAperturaError(err.message || 'Error al aperturar caja.');
                    } finally {
                      setAperturandoCaja(false);
                    }
                  }}
                  className="mx-auto mt-5 max-w-sm space-y-3"
                >
                  {aperturaError && (
                    <div className="rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs text-red-200">
                      {aperturaError}
                    </div>
                  )}
                  <div className="text-left">
                    <label
                      htmlFor="daily-apertura-base-input"
                      className="mb-1 block text-xs font-semibold text-[#D8CFBC]"
                    >
                      Monto principal / Base inicial de nueva caja (Lps)
                    </label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#D8CFBC]"
                      >
                        Lps
                      </span>
                      <input
                        id="daily-apertura-base-input"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={aperturaBaseInput}
                        onChange={(e) => setAperturaBaseInput(e.target.value)}
                        placeholder="Ingresa el monto de apertura"
                        className="min-h-[46px] w-full rounded-xl border border-[#565449] bg-[#1A1B15] py-2.5 pl-12 pr-3 text-base font-extrabold text-[#FFFBF4] placeholder:text-sm placeholder:font-normal placeholder:text-[#9E9A8B] focus:border-[#D8CFBC]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={aperturandoCaja}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FFFBF4] px-4 py-3 text-sm font-extrabold text-[#11120D] transition active:scale-95 disabled:opacity-50"
                  >
                    {aperturandoCaja ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    )}
                    Aperturar caja para nuevo turno
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Hero Métricas del Turno (Sin tarjetas anidadas) */}
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-5 border-b border-[#25231C]">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#A59F91]">
                      Total ingresado en servicios
                    </span>
                    <div className="mt-1 text-4xl sm:text-5xl font-extrabold tracking-tight text-[#FFFBF4]">
                      {formatMoney(totals.total)}
                    </div>
                  </div>
                  {filterType === 'day' && (
                    <div className="flex items-center gap-3 text-xs text-[#A59F91] sm:text-right">
                      <div>
                        <span>Base de apertura: </span>
                        <strong className="text-[#FFFBF4]">{formatMoney(currentDayBase)}</strong>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#25231C] px-2 py-0.5 text-[11px] text-[#A59F91]">
                        <Lock className="h-3 w-3" aria-hidden="true" /> Fijo
                      </span>
                    </div>
                  )}
                </div>

                {/* Colaboradoras: Columnas limpias sin anidación */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-[#25231C]">
                  <div className="rounded-2xl bg-[#1C181A] p-4 border border-[#E8B4B8]/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#E8B4B8]">
                        Lizzy Dinora
                      </span>
                      <span className="h-2 w-2 rounded-full bg-[#E8B4B8]" aria-hidden="true" />
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-[#FFFBF4]">
                      {formatMoney(totals.lizzy)}
                    </div>
                    {totals.valesLizzy > 0 && (
                      <div className="mt-1 text-xs font-semibold text-[#E09F95]">
                        Vales: -{formatMoney(totals.valesLizzy)}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-[#162018] p-4 border border-[#A3C9A8]/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#A3C9A8]">
                        Sandra Viera
                      </span>
                      <span className="h-2 w-2 rounded-full bg-[#A3C9A8]" aria-hidden="true" />
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-[#FFFBF4]">
                      {formatMoney(totals.sandra)}
                    </div>
                    {totals.valesSandra > 0 && (
                      <div className="mt-1 text-xs font-semibold text-[#E09F95]">
                        Vales: -{formatMoney(totals.valesSandra)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Flujo de cobros: Fila integrada */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-[#25231C]">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0E0E0A] border border-[#25231C]">
                    <span className="flex items-center gap-2 text-xs font-bold text-[#A59F91]">
                      <Banknote className="h-4 w-4 text-[#A3C9A8]" aria-hidden="true" />
                      Efectivo cobrado
                    </span>
                    <span className="text-sm font-extrabold text-[#FFFBF4]">
                      {formatMoney(totals.efectivo)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0E0E0A] border border-[#25231C]">
                    <span className="flex items-center gap-2 text-xs font-bold text-[#A59F91]">
                      <CreditCard className="h-4 w-4 text-[#9DBAD8]" aria-hidden="true" />
                      Transferencias
                    </span>
                    <span className="text-sm font-extrabold text-[#FFFBF4]">
                      {formatMoney(totals.transferencia)}
                    </span>
                  </div>
                </div>

                {/* Destacado: Efectivo físico esperado en gaveta */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1E1B13] border border-[#E4C59E]/40">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E4C59E]">
                      Efectivo en gaveta (Caja física)
                    </span>
                    <div className="text-[11px] text-[#A59F91]">
                      Base inicial + Efectivo cobrado - Vales en efectivo
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-[#FFFBF4]">
                    {formatMoney(efectivoEnCaja)}
                  </div>
                </div>

            {/* Vales y Gastos */}
            {(totalValesPeriodo > 0 || totals.gastosTotal > 0) && (
              <div className="mt-3 space-y-2">
                {totalValesPeriodo > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-[#E09F95]/30 bg-[#251717] px-3.5 py-2 text-xs text-[#E09F95]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ArrowDownCircle className="h-4 w-4 text-[#E09F95]" aria-hidden="true" />
                      Vales personales ({filteredVales.length})
                    </span>
                    <span className="font-extrabold">-{formatMoney(totalValesPeriodo)}</span>
                  </div>
                )}
                {totals.gastosTotal > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-[#565449] bg-[#11120D] px-3.5 py-2 text-xs text-[#D8CFBC]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                      Gastos del salón ({filteredGastos.length})
                    </span>
                    <span className="font-extrabold text-[#FFFBF4]">
                      -{formatMoney(totals.gastosTotal)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Botón y formulario para realizar corte de caja manual */}
            <div className="mt-4 space-y-2.5">
              {!manualCutOpen ? (
                <button
                  type="button"
                  onClick={handleOpenManualCut}
                  className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-extrabold transition active:scale-[0.98] ${
                    justSavedCut
                      ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'bg-[#FFFBF4] text-[#11120D] shadow-lg hover:bg-[#D8CFBC]'
                  }`}
                >
                  {justSavedCut ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                      Corte de caja guardado
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                      Realizar corte de caja manual
                    </>
                  )}
                </button>
              ) : (
                <form
                  onSubmit={handleSaveManualCut}
                  className="space-y-3.5 rounded-2xl border border-[#D8CFBC]/50 bg-[#11120D] p-4"
                >
                  <div className="flex items-center justify-between border-b border-[#565449]/50 pb-2.5">
                    <span className="text-sm font-extrabold text-[#FFFBF4]">
                      Registrar Corte de Caja (Arqueo)
                    </span>
                    <span className="text-xs font-semibold text-[#D8CFBC]">
                      Esperado: {formatMoney(cutPreview.efectivoEsperado)}
                    </span>
                  </div>

                  {/* Nombre y Horas de Apertura y Corte */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="manual-cut-label"
                        className="mb-1 block text-xs font-semibold text-[#D8CFBC]"
                      >
                        Identificador
                      </label>
                      <input
                        id="manual-cut-label"
                        type="text"
                        value={manualCutLabel}
                        onChange={(e) => setManualCutLabel(e.target.value)}
                        placeholder="Ej. Corte #1, Turno tarde"
                        className="min-h-[40px] w-full rounded-xl border border-[#565449] bg-[#1A1B15] px-3 py-2 text-xs font-bold text-[#FFFBF4] focus:border-[#D8CFBC]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="manual-cut-open-time"
                        className="mb-1 block text-xs font-semibold text-[#D8CFBC]"
                      >
                        Hora de Apertura
                      </label>
                      <input
                        id="manual-cut-open-time"
                        type="time"
                        value={manualCutOpenTime}
                        onChange={(e) => setManualCutOpenTime(e.target.value)}
                        className="min-h-[40px] w-full rounded-xl border border-[#565449] bg-[#1A1B15] px-3 py-2 text-xs font-bold text-[#FFFBF4] focus:border-[#D8CFBC]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="manual-cut-close-time"
                        className="mb-1 block text-xs font-semibold text-[#D8CFBC]"
                      >
                        Hora de Corte (Cierre)
                      </label>
                      <input
                        id="manual-cut-close-time"
                        type="time"
                        value={manualCutCloseTime}
                        onChange={(e) => setManualCutCloseTime(e.target.value)}
                        className="min-h-[40px] w-full rounded-xl border border-[#565449] bg-[#1A1B15] px-3 py-2 text-xs font-bold text-[#FFFBF4] focus:border-[#D8CFBC]"
                      />
                    </div>
                  </div>

                  {/* Alcance del corte */}
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setManualCutScope('shift')}
                      className={`flex-1 rounded-xl border py-2 text-center font-bold transition ${
                        manualCutScope === 'shift'
                          ? 'border-[#D8CFBC] bg-[#D8CFBC] text-[#11120D]'
                          : 'border-[#565449] bg-[#1A1B15] text-[#D8CFBC]'
                      }`}
                    >
                      Turno ({manualCutOpenTime} - {manualCutCloseTime})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualCutScope('allDay')}
                      className={`flex-1 rounded-xl border py-2 text-center font-bold transition ${
                        manualCutScope === 'allDay'
                          ? 'border-[#D8CFBC] bg-[#D8CFBC] text-[#11120D]'
                          : 'border-[#565449] bg-[#1A1B15] text-[#D8CFBC]'
                      }`}
                    >
                      Todo el día acumulado
                    </button>
                  </div>

                  {/* Resumen de movimientos comprendidos */}
                  <div className="rounded-xl border border-[#565449]/60 bg-[#1A1B15] p-3 text-xs">
                    <div className="flex justify-between font-bold text-[#FFFBF4]">
                      <span>{cutPreview.jobs.length} trabajos comprendidos</span>
                      <span>Total: {formatMoney(cutPreview.total)}</span>
                    </div>
                    <div className="mt-1 text-[#9E9A8B]">
                      Lizzy: {formatMoney(cutPreview.lizzy)} • Sandra: {formatMoney(cutPreview.sandra)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[#D8CFBC]">
                      <span>Efectivo cobrado: {formatMoney(cutPreview.efectivo)}</span>
                      <span>•</span>
                      <span>Transferencias: {formatMoney(cutPreview.transferencia)}</span>
                    </div>
                  </div>

                  {/* Efectivo físico contado */}
                  <div>
                    <label
                      htmlFor="manual-cut-counted"
                      className="mb-1 block text-xs font-semibold text-[#D8CFBC]"
                    >
                      Efectivo físico contado en caja (billetes y monedas)
                    </label>
                    <div className="relative flex items-center">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 text-sm font-bold text-[#D8CFBC]"
                      >
                        Lps
                      </span>
                      <input
                        id="manual-cut-counted"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={countedCashInput}
                        onChange={(e) => setCountedCashInput(e.target.value)}
                        placeholder={String(cutPreview.efectivoEsperado)}
                        className="min-h-[44px] w-full rounded-xl border border-[#565449] bg-[#1A1B15] py-2.5 pl-12 pr-3 text-lg font-extrabold text-[#FFFBF4] focus:border-[#D8CFBC]"
                      />
                    </div>
                    {Number.isFinite(cutCountedNumeric) && (
                      <div className="mt-1.5 text-xs font-bold">
                        {cutCashDiff === 0 ? (
                          <span className="text-[#D8CFBC]">Caja cuadrada exacta.</span>
                        ) : cutCashDiff > 0 ? (
                          <span className="text-emerald-300">
                            Sobrante en caja: +{formatMoney(cutCashDiff)}
                          </span>
                        ) : (
                          <span className="text-amber-300">
                            Faltante en caja: {formatMoney(cutCashDiff)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="manual-cut-note"
                      className="mb-1 block text-xs font-semibold text-[#9E9A8B]"
                    >
                      Observación (opcional)
                    </label>
                    <input
                      id="manual-cut-note"
                      type="text"
                      value={manualCutNote}
                      onChange={(e) => setManualCutNote(e.target.value)}
                      placeholder="Ej. Todo cuadrado, entrega de turno..."
                      className="min-h-[42px] w-full rounded-xl border border-[#565449] bg-[#1A1B15] px-3.5 py-2 text-sm text-[#FFFBF4] placeholder-[#9E9A8B] focus:border-[#D8CFBC]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setManualCutOpen(false)}
                      className="min-h-[44px] rounded-xl border border-[#565449] bg-[#1A1B15] py-2.5 text-xs font-bold text-[#D8CFBC]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingManualCut}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#FFFBF4] py-2.5 text-xs font-extrabold text-[#11120D] active:scale-95 disabled:opacity-50"
                    >
                      {savingManualCut ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Guardar corte de caja
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition active:scale-[0.98] sm:text-sm ${
                  justSharedWa
                    ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-200'
                    : 'bg-[#D8CFBC] text-[#11120D] hover:bg-[#FFFBF4]'
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
                    Enviar resumen por WhatsApp
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </section>

          {/* Trabajos registrados en la fecha / corte seleccionado */}
          <section className="rounded-3xl border border-[#2D2A22] bg-[#161511] overflow-hidden shadow-lg">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#25231C]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A59F91]">
                Historial de servicios
              </h3>
              <span className="rounded-full bg-[#25231C] px-3 py-1 text-xs font-semibold text-[#D8CFBC]">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'servicio' : 'servicios'}
              </span>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-[#7D786D]">
                No hay servicios registrados en este turno.
              </div>
            ) : (
              <div className="divide-y divide-[#222019]">
                {filteredJobs.map((job) => {
                  const workerInfo = WORKERS[job.worker] || WORKERS.lizzy;

                  return (
                    <div
                      key={job.id}
                      className="p-4 sm:p-5 transition hover:bg-[#1A1914] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-[#FFFBF4]">{job.description}</span>
                          {job.clientReference && (
                            <span className="text-xs text-[#E4C59E] font-medium">
                              • {job.clientReference}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`rounded-lg border px-2 py-0.5 font-semibold ${workerInfo.badgeClass}`}
                          >
                            {workerInfo.shortName}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#222019] px-2 py-0.5 text-[#D8CFBC]">
                            {job.paymentMethod === 'efectivo' ? (
                              <Banknote className="h-3 w-3 text-[#A3C9A8]" aria-hidden="true" />
                            ) : (
                              <CreditCard className="h-3 w-3 text-[#9DBAD8]" aria-hidden="true" />
                            )}
                            {job.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                          </span>
                          <span className="text-[#7D786D]">
                            {filterType === 'day'
                              ? formatTime(job.createdAt)
                              : formatDateTime(job.createdAt)}
                          </span>
                        </div>
                        {job.worker === 'both' && (
                          <div className="mt-1.5 text-xs text-[#7D786D]">
                            Lizzy: <span className="text-[#E8B4B8] font-bold">{formatMoney(job.lizzyAmount)}</span> • Sandra:{' '}
                            <span className="text-[#A3C9A8] font-bold">{formatMoney(job.sandraAmount)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg sm:text-xl font-extrabold text-[#FFFBF4]">
                            {formatMoney(job.amount)}
                          </div>
                          {job.corteId && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7D786D]">
                              <Lock className="h-3 w-3" aria-hidden="true" /> Cerrado
                            </span>
                          )}
                        </div>
                        {!job.corteId && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingJob(job)}
                              aria-label="Corregir trabajo"
                              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-[#222019] text-[#D8CFBC] hover:text-[#FFFBF4] active:scale-95"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteJob(job.id)}
                              aria-label="Eliminar trabajo"
                              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-[#222019] text-[#8E897C] transition active:scale-95 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Cortes de caja manuales guardados */}
          {filteredCortesDiarios.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#D8CFBC]">
                Cortes de caja guardados ({filteredCortesDiarios.length})
              </h3>
              {filteredCortesDiarios.map((corte) => (
                <div
                  key={corte.id}
                  className="rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#565449]/40 pb-2.5">
                    <div>
                      <div className="text-sm font-extrabold text-[#FFFBF4]">
                        {corte.corteLabel || 'Corte de caja'} • {formatDateKeyLabel(corte.dateKey)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D8CFBC]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#D8CFBC]" aria-hidden="true" />
                          Apertura: {formatTime(corte.openedAt)}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                          Corte: {formatTime(corte.closedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCorteModal(corte)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#D8CFBC] px-3.5 py-2 text-xs font-extrabold text-[#11120D] active:scale-95"
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteCorteDiario(corte.id)}
                        aria-label="Eliminar corte de caja"
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[#565449] bg-[#11120D] text-xs font-bold text-[#9E9A8B] active:scale-95 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[#11120D] px-3 py-2">
                      <span className="text-[#9E9A8B]">Efectivo esperado:</span>
                      <div className="font-bold text-[#FFFBF4]">
                        {formatMoney(corte.efectivoEsperado)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#11120D] px-3 py-2">
                      <span className="text-[#9E9A8B]">Efectivo contado:</span>
                      <div className="font-bold text-[#FFFBF4]">
                        {formatMoney(corte.efectivoContado)}
                      </div>
                    </div>
                  </div>

                  {corte.diferencia !== 0 && (
                    <div className="mt-2 text-xs font-bold text-amber-300">
                      Diferencia: {corte.diferencia > 0 ? '+' : ''}
                      {formatMoney(corte.diferencia)}
                    </div>
                  )}
                  {corte.note && (
                    <div className="mt-1.5 text-xs text-[#D8CFBC]">Nota: {corte.note}</div>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {/* Modal de Detalle de Corte */}
      {selectedCorteModal && (
        <CorteDetailModal
          corte={selectedCorteModal}
          allJobs={jobs}
          onClose={() => setSelectedCorteModal(null)}
          onRequestDelete={handleRequestDeleteCorteDiario}
        />
      )}

      {/* Modal de Edición de Trabajo */}
      {editingJob && (
        <EditJobModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSave={onUpdateJob}
        />
      )}

      {/* Modal de Seguridad */}
      <SecurityPinModal
        isOpen={securityModal.isOpen}
        title={securityModal.title}
        description={securityModal.description}
        onConfirm={async (pwd) => {
          if (securityModal.onConfirmAction) {
            await securityModal.onConfirmAction(pwd);
          }
        }}
        onClose={() =>
          setSecurityModal({
            isOpen: false,
            title: '',
            description: '',
            onConfirmAction: null,
          })
        }
      />
    </div>
  );
}
