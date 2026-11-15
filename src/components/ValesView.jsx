import { useState } from 'react';
import {
  ArrowDownCircle,
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShoppingBag,
  Trash2,
  User,
} from 'lucide-react';
import {
  QUICK_GASTO_NOTES,
  QUICK_VALE_NOTES,
  formatDateTime,
  formatMoney,
} from '../utils/format';
import SecurityPinModal from './SecurityPinModal';

const COLLABORATORS = [
  {
    id: 'lizzy',
    label: 'Lizzy',
    fullName: 'Lizzy Dinora Viera',
    activeBg: 'bg-[#261B1D] border-[#E8B4B8] text-[#FFFBF4]',
    iconActive: 'bg-[#E8B4B8] text-[#1A1214]',
    iconInactive: 'bg-[#E8B4B8]/15 text-[#E8B4B8]',
  },
  {
    id: 'sandra',
    label: 'Sandra',
    fullName: 'Sandra Viera',
    activeBg: 'bg-[#19241C] border-[#A3C9A8] text-[#FFFBF4]',
    iconActive: 'bg-[#A3C9A8] text-[#0E1711]',
    iconInactive: 'bg-[#A3C9A8]/15 text-[#A3C9A8]',
  },
];

const PAYMENT_OPTIONS = [
  {
    id: 'efectivo',
    label: 'Efectivo',
    Icon: Banknote,
    activeBg: 'bg-[#19241C] border-[#A3C9A8] text-[#FFFBF4]',
    activeIcon: 'text-[#A3C9A8]',
  },
  {
    id: 'transferencia',
    label: 'Transferencia',
    Icon: CreditCard,
    activeBg: 'bg-[#18202A] border-[#9DBAD8] text-[#FFFBF4]',
    activeIcon: 'text-[#9DBAD8]',
  },
];

export default function ValesView({
  vales,
  gastos = [],
  onCreateVale,
  onDeleteVale,
  onCreateGasto,
  onDeleteGasto,
}) {
  const [entryType, setEntryType] = useState('vale');
  const [worker, setWorker] = useState('lizzy');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState('');
  const [error, setError] = useState('');
  const [securityModal, setSecurityModal] = useState({
    isOpen: false,
    id: null,
    kind: null,
  });

  const activeVales = vales.filter((v) => !v.corteId);
  const activeGastos = gastos.filter((g) => !g.corteId);

  const lizzyValesTotal = activeVales
    .filter((v) => v.worker === 'lizzy')
    .reduce((sum, v) => sum + v.amount, 0);
  const sandraValesTotal = activeVales
    .filter((v) => v.worker === 'sandra')
    .reduce((sum, v) => sum + v.amount, 0);
  const gastosTotal = activeGastos.reduce((sum, g) => sum + g.amount, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setJustSaved('');
    const num = parseFloat(amount);

    if (!Number.isFinite(num) || num <= 0) {
      setError('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (entryType === 'gasto' && !note.trim()) {
      setError('Elige o escribe en qué se gastó (ej. Tintes, Agua).');
      return;
    }

    setSubmitting(true);
    try {
      if (entryType === 'vale') {
        await onCreateVale({
          worker,
          amount: num,
          paymentMethod,
          note: note.trim(),
        });
        setJustSaved('Vale registrado correctamente');
      } else {
        await onCreateGasto({
          description: note.trim(),
          amount: num,
          paymentMethod,
        });
        setJustSaved('Gasto del salón registrado');
      }
      setAmount('');
      setNote('');
      setTimeout(() => setJustSaved(''), 2400);
    } catch (err) {
      setError(err.message || 'No se pudo registrar la salida.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRequestDelete(id, kind) {
    setSecurityModal({
      isOpen: true,
      id,
      kind,
    });
  }

  async function handleConfirmDelete(adminPassword) {
    const { id, kind } = securityModal;
    if (kind === 'vale') {
      await onDeleteVale(id, adminPassword);
    } else {
      await onDeleteGasto(id, adminPassword);
    }
  }

  const presetNotes = entryType === 'vale' ? QUICK_VALE_NOTES : QUICK_GASTO_NOTES;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      {/* Resumen Superior de Salidas: Franja plana sin anidación */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#E8B4B8]/30 bg-[#1A1617] p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[#E8B4B8]">
            Vales Lizzy
          </div>
          <div className="mt-1 text-2xl font-extrabold text-[#E09F95]">
            -{formatMoney(lizzyValesTotal)}
          </div>
        </div>

        <div className="rounded-2xl border border-[#A3C9A8]/30 bg-[#141A16] p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[#A3C9A8]">
            Vales Sandra
          </div>
          <div className="mt-1 text-2xl font-extrabold text-[#E09F95]">
            -{formatMoney(sandraValesTotal)}
          </div>
        </div>

        <div className="rounded-2xl border border-[#9DBAD8]/30 bg-[#14181E] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9DBAD8]">
              Gastos Salón
            </span>
            <span className="rounded bg-[#A3C9A8]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#A3C9A8]">
              Deduce Sandra
            </span>
          </div>
          <div className="mt-1 text-2xl font-extrabold text-[#FFFBF4]">
            -{formatMoney(gastosTotal)}
          </div>
        </div>
      </div>

      {/* Formulario Principal de Salida */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-[#2D2A22] bg-[#161511] p-5 sm:p-7 shadow-lg space-y-6"
      >
        {/* Toggle de Tipo: Vale vs Gasto */}
        <div>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#0D0D09] p-1.5 border border-[#26241D]">
            <button
              type="button"
              aria-pressed={entryType === 'vale'}
              onClick={() => {
                setEntryType('vale');
                setError('');
                setJustSaved('');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition ${
                entryType === 'vale'
                  ? 'bg-[#E09F95] text-[#1E0F0E] shadow-sm'
                  : 'text-[#8E897C] hover:text-[#FFFBF4]'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
              Vale personal
              {entryType === 'vale' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
            <button
              type="button"
              aria-pressed={entryType === 'gasto'}
              onClick={() => {
                setEntryType('gasto');
                setError('');
                setJustSaved('');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition ${
                entryType === 'gasto'
                  ? 'bg-[#9DBAD8] text-[#0E151E] shadow-sm'
                  : 'text-[#8E897C] hover:text-[#FFFBF4]'
              }`}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Gasto del salón
              {entryType === 'gasto' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </div>

          <p className="mt-2.5 text-xs text-[#8E897C]">
            {entryType === 'vale'
              ? 'El vale personal se descuenta del pago quincenal de la colaboradora seleccionada.'
              : 'El gasto del salón (insumos, productos, etc.) resta del efectivo en caja y se deduce del pago quincenal de Sandra Viera.'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {/* Colaboradora (si es vale) */}
        {entryType === 'vale' && (
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-[#A59F91] mb-2.5">
              ¿Quién retira el dinero?
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#0D0D09] p-1.5 border border-[#26241D]">
              {COLLABORATORS.map((opt) => {
                const active = worker === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWorker(opt.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition ${
                      active
                        ? `${opt.activeBg} border`
                        : 'text-[#8E897C] hover:text-[#FFFBF4]'
                    }`}
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span>{opt.label}</span>
                    <span className="hidden sm:inline text-[11px] opacity-75">({opt.fullName.split(' ')[0]})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Monto del retiro */}
        <div>
          <label htmlFor="vale-amount" className="block text-xs font-bold uppercase tracking-wider text-[#A59F91] mb-2">
            {entryType === 'vale' ? 'Monto a retirar' : 'Monto del gasto'}
          </label>
          <div className="flex items-center pb-4 border-b border-[#25231C]">
            <span className="pointer-events-none text-2xl sm:text-3xl font-extrabold text-[#E4C59E] mr-3">
              Lps
            </span>
            <input
              id="vale-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
                setJustSaved('');
              }}
              placeholder="0.00"
              className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold tracking-tight text-[#FFFBF4] placeholder-[#38362D] focus:outline-none"
            />
          </div>
        </div>

        {/* Método de salida */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-[#A59F91] mb-2">
            ¿Cómo salió el dinero?
          </span>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#0D0D09] p-1.5 border border-[#26241D]">
            {PAYMENT_OPTIONS.map(({ id, label, Icon, activeBg }) => {
              const active = paymentMethod === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition ${
                    active
                      ? `${activeBg} border`
                      : 'text-[#8E897C] hover:text-[#FFFBF4]'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Motivo o Nota */}
        <div className="space-y-2">
          <label htmlFor="vale-note" className="block text-xs font-bold uppercase tracking-wider text-[#A59F91]">
            {entryType === 'vale' ? 'Motivo (opcional)' : 'Concepto del gasto (obligatorio)'}
          </label>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {presetNotes.map((item) => {
              const active = note.trim().toLowerCase() === item.toLowerCase();
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setNote(item);
                    setError('');
                    setJustSaved('');
                  }}
                  className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                    active
                      ? 'bg-[#E4C59E] text-[#1A150E]'
                      : 'bg-[#222019] text-[#A59F91] hover:text-[#FFFBF4]'
                  }`}
                >
                  {active && <Check className="h-3 w-3" aria-hidden="true" />}
                  {item}
                </button>
              );
            })}
          </div>
          <input
            id="vale-note"
            type="text"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError('');
              setJustSaved('');
            }}
            placeholder={
              entryType === 'vale'
                ? 'Nota o motivo del retiro...'
                : 'Ej. Compra de tinte, acetona, agua...'
            }
            className="h-[46px] w-full rounded-2xl border border-[#2B2921] bg-[#0E0E0A] px-4 text-sm text-[#FFFBF4] placeholder-[#565449] focus:border-[#E4C59E] focus:outline-none"
          />
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={submitting}
          className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold transition active:scale-[0.98] disabled:opacity-60 shadow-lg ${
            justSaved
              ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-200'
              : 'bg-[#FFFBF4] text-[#11120D] hover:bg-[#E5DFD3]'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Registrando...
            </>
          ) : justSaved ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
              {justSaved}
            </>
          ) : (
            <>
              {entryType === 'vale' ? (
                <ArrowDownCircle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              )}
              {entryType === 'vale' ? 'Registrar vale personal' : 'Registrar gasto del salón'}
            </>
          )}
        </button>
      </form>

      {/* Historial de Salidas (Estilo Libro Mayor) */}
      <section className="rounded-3xl border border-[#2D2A22] bg-[#161511] overflow-hidden shadow-lg">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#25231C]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A59F91]">
            Salidas de la quincena
          </h3>
          <span className="rounded-full bg-[#25231C] px-3 py-1 text-xs font-semibold text-[#D8CFBC]">
            {activeVales.length + activeGastos.length} registros
          </span>
        </div>

        {activeVales.length === 0 && activeGastos.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[#7D786D]">
            No hay vales ni gastos registrados en esta quincena.
          </div>
        ) : (
          <div className="divide-y divide-[#222019]">
            {[
              ...activeVales.map((v) => ({ ...v, _kind: 'vale' })),
              ...activeGastos.map((g) => ({ ...g, _kind: 'gasto' })),
            ]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((item) => {
                const isVale = item._kind === 'vale';

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 transition hover:bg-[#1A1914] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-base font-bold ${
                          isVale
                            ? item.worker === 'lizzy'
                              ? 'text-[#E8B4B8]'
                              : 'text-[#A3C9A8]'
                            : 'text-[#9DBAD8]'
                        }`}>
                          {isVale
                            ? item.worker === 'lizzy'
                              ? 'Lizzy Dinora'
                              : 'Sandra Viera'
                            : item.description}
                        </span>
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                            isVale
                              ? 'border border-[#E09F95]/30 bg-[#E09F95]/15 text-[#E09F95]'
                              : 'border border-[#9DBAD8]/30 bg-[#9DBAD8]/15 text-[#9DBAD8]'
                          }`}
                        >
                          {isVale ? 'Vale personal' : 'Gasto del salón'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7D786D]">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#222019] px-2 py-0.5 text-[#D8CFBC]">
                          {item.paymentMethod === 'efectivo' ? (
                            <Banknote className="h-3 w-3 text-[#A3C9A8]" aria-hidden="true" />
                          ) : (
                            <CreditCard className="h-3 w-3 text-[#9DBAD8]" aria-hidden="true" />
                          )}
                          {item.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                        </span>
                        {isVale && item.note && <span className="text-[#D8CFBC]">• {item.note}</span>}
                        <span>• {formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-lg sm:text-xl font-extrabold ${isVale ? 'text-[#E09F95]' : 'text-[#9DBAD8]'}`}>
                        -{formatMoney(item.amount)}
                      </span>
                      {item.corteId ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7D786D]">
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label="Eliminar registro"
                          onClick={() => handleRequestDelete(item.id, item._kind)}
                          className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-[#222019] text-[#8E897C] transition active:scale-95 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <SecurityPinModal
        isOpen={securityModal.isOpen}
        title={securityModal.kind === 'vale' ? 'Eliminar Vale' : 'Eliminar Gasto del Salón'}
        description="Ingresa la contraseña de administradora para eliminar este registro."
        onConfirm={handleConfirmDelete}
        onClose={() => setSecurityModal({ isOpen: false, id: null, kind: null })}
      />
    </div>
  );
}
