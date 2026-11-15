import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Lock, X } from 'lucide-react';
import { isValidAdminPassword } from '../utils/security';

export default function SecurityPinModal({
  isOpen,
  title = 'Autorización Requerida',
  description = 'Ingresa la contraseña de administradora para confirmar esta acción.',
  onConfirm,
  onClose,
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setPassword('');
        setError('');
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) {
      setError('Por favor ingresa la contraseña.');
      return;
    }

    if (!isValidAdminPassword(password)) {
      setError('Contraseña de administradora incorrecta.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onConfirm(password);
      setPassword('');
      onClose();
    } catch (err) {
      setError(err.message || 'Contraseña incorrecta.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setPassword('');
    setError('');
    onClose();
  }

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overscroll-contain overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative my-auto w-full max-w-sm rounded-3xl border border-[#2B2921] bg-[#161511] p-5 shadow-2xl sm:p-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[#E4C59E]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E4C59E]/10 border border-[#E4C59E]/20">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 id="security-modal-title" className="text-base font-extrabold text-[#FFFBF4]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#26241D] bg-[#11100D] text-[#8E897C] hover:border-[#E4C59E]/40 hover:text-[#FFFBF4] transition"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-[#8E897C]">{description}</p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="security-admin-password"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#A59F91]"
            >
              Contraseña de Administradora
            </label>
            <div className="relative flex items-center">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 text-[#7D786D]"
              >
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                id="security-admin-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="min-h-[46px] w-full rounded-2xl border border-[#2B2921] bg-[#0E0E0A] py-2.5 pl-10 pr-3 text-sm text-[#FFFBF4] placeholder-[#565449] focus:border-[#E4C59E] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] rounded-2xl border border-[#26241D] bg-[#11100D] text-xs font-bold text-[#A59F91] hover:border-[#38362D] hover:text-[#FFFBF4] transition active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] rounded-2xl bg-[#FFFBF4] text-xs font-extrabold text-[#11100D] hover:bg-[#E5DFD3] transition active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
