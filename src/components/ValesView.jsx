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
  { id: 'lizzy', label: 'Lizzy', fullName: 'Lizzy Dinora Viera' },
  { id: 'sandra', label: 'Sandra', fullName: 'Sandra Viera' },
];

const PAYMENT_OPTIONS = [
  { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', Icon: CreditCard },
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
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#D8CFBC]">
            Acumulado en la quincena actual
          </h2>
          <span className="rounded-xl border border-[#565449]/50 bg-[#11120D] px-2.5 py-1 text-xs font-semibold text-[#D8CFBC]">
            {activeVales.length} vales • {activeGastos.length} gastos
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#565449]/60 bg-[#11120D] p-3.5">
            <div className="text-xs font-semibold text-[#D8CFBC]">Vales Lizzy</div>
            <div className="mt-1 text-xl font-extrabold text-amber-300">
              -{formatMoney(lizzyValesTotal)}
            </div>
          </div>
          <div className="rounded-2xl border border-[#565449]/60 bg-[#11120D] p-3.5">
            <div className="text-xs font-semibold text-[#D8CFBC]">Vales Sandra</div>
            <div className="mt-1 text-xl font-extrabold text-amber-300">
              -{formatMoney(sandraValesTotal)}
            </div>
          </div>
          <div className="rounded-2xl border border-[#565449]/60 bg-[#11120D] p-3.5">
            <div className="text-xs font-semibold text-[#D8CFBC]">Gastos del salón</div>
            <div className="mt-1 text-xl font-extrabold text-[#FFFBF4]">
              -{formatMoney(gastosTotal)}
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4 sm:p-5"
      >
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#565449]/60 bg-[#11120D] p-1">
          <button
            type="button"
            aria-pressed={entryType === 'vale'}
            onClick={() => {
              setEntryType('vale');
              setError('');
              setJustSaved('');
            }}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg py-2 text-xs font-extrabold transition sm:text-sm ${
              entryType === 'vale' ? 'bg-[#D8CFBC] text-[#11120D]' : 'text-[#D8CFBC]'
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
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-lg py-2 text-xs font-extrabold transition sm:text-sm ${
              entryType === 'gasto' ? 'bg-[#D8CFBC] text-[#11120D]' : 'text-[#D8CFBC]'
            }`}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Gasto del salón
            {entryType === 'gasto' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>

        <p className="text-xs text-[#9E9A8B]">
          {entryType === 'vale'
            ? 'El vale personal se descuenta del pago quincenal de la colaboradora seleccionada.'
            : 'El gasto del salón (insumos, agua, etc.) resta del efectivo en caja sin afectar el sueldo individual.'}
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {entryType === 'vale' && (
          <div>
            <span className="mb-2 block text-sm font-semibold text-[#D8CFBC]">
              ¿Quién retira el dinero?
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {COLLABORATORS.map(({ id, label, fullName }) => {
                const active = worker === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWorker(id)}
                    className={`flex items-center justify-between gap-2 rounded-2xl border p-3.5 text-left transition active:scale-[0.97] ${
                      active
                        ? 'border-[#FFFBF4] bg-[#D8CFBC] text-[#11120D] ring-2 ring-[#FFFBF4]/40'
                        : 'border-[#565449]/70 bg-[#11120D] text-[#D8CFBC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          active ? 'bg-[#11120D] text-[#FFFBF4]' : 'bg-[#565449]/40 text-[#D8CFBC]'
                        }`}
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <div className={`text-sm font-extrabold ${active ? 'text-[#11120D]' : 'text-[#FFFBF4]'}`}>
                          {label}
                        </div>
                        <div className={`text-[11px] ${active ? 'text-[#11120D]/80 font-medium' : 'text-[#9E9A8B]'}`}>
                          {fullName}
                        </div>
                      </div>
                    </div>
                    {active && <Check className="h-4 w-4 shrink-0 text-[#11120D]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="vale-amount" className="mb-2 block text-sm font-semibold text-[#D8CFBC]">
            {entryType === 'vale' ? 'Monto del vale' : 'Monto del gasto'}
          </label>
          <div className="relative flex items-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 text-lg font-bold text-[#D8CFBC]"
            >
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
              placeholder="0"
              className="w-full rounded-xl border border-[#565449]/70 bg-[#11120D] py-3.5 pl-14 pr-4 text-2xl font-bold text-[#FFFBF4] placeholder-[#565449] focus:border-[#D8CFBC]"
            />
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-semibold text-[#D8CFBC]">
            ¿Cómo salió el dinero?
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {PAYMENT_OPTIONS.map(({ id, label, Icon }) => {
              const active = paymentMethod === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-extrabold transition active:scale-[0.97] ${
                    active
                      ? 'border-[#FFFBF4] bg-[#D8CFBC] text-[#11120D] ring-2 ring-[#FFFBF4]/40'
                      : 'border-[#565449]/70 bg-[#11120D] text-[#D8CFBC]'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                  {active && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="vale-note" className="mb-2 block text-sm font-semibold text-[#D8CFBC]">
            {entryType === 'vale' ? 'Motivo (opcional)' : '¿En qué se gastó? (obligatorio)'}
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
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
                  className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                    active
                      ? 'bg-[#D8CFBC] text-[#11120D] ring-1 ring-[#FFFBF4]'
                      : 'border border-[#565449]/60 bg-[#11120D] text-[#D8CFBC]'
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
            className="w-full rounded-xl border border-[#565449]/70 bg-[#11120D] px-4 py-3 text-sm text-[#FFFBF4] placeholder-[#9E9A8B] focus:border-[#D8CFBC]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold transition active:scale-[0.98] disabled:opacity-60 ${
            justSaved
              ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-200'
              : 'bg-[#FFFBF4] text-[#11120D] shadow-lg hover:bg-[#D8CFBC]'
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

      <section className="space-y-2.5">
        <h3 className="text-sm font-bold text-[#D8CFBC]">
          Salidas registradas en la quincena ({activeVales.length + activeGastos.length})
        </h3>

        {activeVales.length === 0 && activeGastos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#565449]/60 bg-[#1A1B15]/50 px-4 py-8 text-center text-sm text-[#9E9A8B]">
            No hay vales ni gastos registrados en esta quincena.
          </div>
        ) : (
          [
            ...activeVales.map((v) => ({ ...v, _kind: 'vale' })),
            ...activeGastos.map((g) => ({ ...g, _kind: 'gasto' })),
          ]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((item) => {
              const isVale = item._kind === 'vale';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#565449]/60 bg-[#1A1B15] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-[#FFFBF4]">
                        {isVale
                          ? item.worker === 'lizzy'
                            ? 'Lizzy Dinora Viera'
                            : 'Sandra Viera'
                          : item.description}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                          isVale
                            ? 'border border-amber-400/30 bg-amber-500/15 text-amber-300'
                            : 'bg-[#565449]/50 text-[#D8CFBC]'
                        }`}
                      >
                        {isVale ? 'Vale personal' : 'Gasto del salón'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9E9A8B]">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-[#565449]/40 bg-[#11120D] px-2 py-0.5 text-[#D8CFBC]">
                        {item.paymentMethod === 'efectivo' ? (
                          <Banknote className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <CreditCard className="h-3 w-3" aria-hidden="true" />
                        )}
                        {item.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                      </span>
                      {isVale && item.note && <span className="text-[#D8CFBC]">{item.note}</span>}
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-lg font-extrabold text-amber-300">
                      -{formatMoney(item.amount)}
                    </span>
                    {item.corteId ? (
                      <Lock className="h-4 w-4 text-[#565449]" aria-label="Cerrado" />
                    ) : (
                      <button
                        type="button"
                        aria-label="Eliminar registro"
                        onClick={() => handleRequestDelete(item.id, item._kind)}
                        className="min-h-[40px] rounded-xl border border-[#565449]/70 bg-[#11120D] px-3 py-2 text-xs font-bold text-[#9E9A8B] transition active:scale-95 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
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
