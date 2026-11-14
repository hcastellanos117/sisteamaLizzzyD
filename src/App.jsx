import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Scissors } from 'lucide-react';
import { api } from './api';
import CortesView from './components/CortesView';
import DailySummary from './components/DailySummary';
import { DesktopNav, MobileNav } from './components/Navigation';
import QuickRegister from './components/QuickRegister';
import ValesView from './components/ValesView';

export default function App() {
  const [activeTab, setActiveTab] = useState('register');
  const [state, setState] = useState({
    jobs: [],
    vales: [],
    gastos: [],
    cortes: [],
    cortesDiarios: [],
    cajaBases: {},
    cajaSesion: { status: 'closed' },
    quincena: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg('');
    }, 2400);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const data = await api.getState();
      setState({
        jobs: data.jobs || [],
        vales: data.vales || [],
        gastos: data.gastos || [],
        cortes: data.cortes || [],
        cortesDiarios: data.cortesDiarios || [],
        cajaBases: data.cajaBases || {},
        cajaSesion: data.cajaSesion || { status: 'closed' },
        quincena: data.quincena || null,
      });
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'No se pudo conectar con el servidor local.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();

    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type && msg.type !== 'connected') {
          fetchState();
        }
      } catch {
        // ignore malformed SSE payload
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const timer = setInterval(fetchState, 60000);

    return () => {
      evtSource.close();
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(timer);
    };
  }, [fetchState]);

  async function handleCreateJob(payload) {
    await api.createJob(payload);
    await fetchState();
    showToast('Trabajo guardado');
  }

  async function handleUpdateJob(id, payload, adminPassword) {
    await api.updateJob(id, payload, adminPassword);
    await fetchState();
    showToast('Trabajo actualizado');
  }

  async function handleDeleteJob(id, adminPassword) {
    await api.deleteJob(id, adminPassword);
    await fetchState();
    showToast('Trabajo eliminado');
  }

  async function handleCreateVale(payload) {
    await api.createVale(payload);
    await fetchState();
    showToast('Vale registrado');
  }

  async function handleDeleteVale(id, adminPassword) {
    await api.deleteVale(id, adminPassword);
    await fetchState();
    showToast('Vale eliminado');
  }

  async function handleCreateGasto(payload) {
    await api.createGasto(payload);
    await fetchState();
    showToast('Gasto del salón registrado');
  }

  async function handleDeleteGasto(id, adminPassword) {
    await api.deleteGasto(id, adminPassword);
    await fetchState();
    showToast('Gasto eliminado');
  }

  async function handleUpdateCajaBase(dateKey, amount, adminPassword) {
    await api.updateCajaBase(dateKey, amount, adminPassword);
    await fetchState();
    showToast('Base de caja actualizada');
  }

  async function handleCreateCorteDiario(payload) {
    await api.createCorteDiario(payload);
    await fetchState();
    showToast('Corte de caja manual guardado');
  }

  async function handleDeleteCorteDiario(id, adminPassword) {
    await api.deleteCorteDiario(id, adminPassword);
    await fetchState();
    showToast('Corte de caja eliminado');
  }

  async function handleCloseCorte() {
    await api.closeCorte();
    await fetchState();
    showToast('Corte quincenal cerrado');
  }

  async function handleAperturarCaja(baseAmount, dateKey) {
    try {
      const res = await api.aperturarCaja(baseAmount, dateKey);
      if (res?.cajaSesion) {
        setState((prev) => ({ ...prev, cajaSesion: res.cajaSesion }));
      }
      await fetchState();
      showToast('Caja lista para registrar');
    } catch (err) {
      await fetchState();
      throw err;
    }
  }

  const hasCorteAlert = Boolean(state.quincena?.shouldAlert);

  return (
    <div className="min-h-screen bg-[#11120D] pb-24 text-[#FFFBF4] sm:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#565449]/60 bg-[#11120D]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D8CFBC] text-[#11120D]">
              <Scissors className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-base font-extrabold tracking-tight text-[#FFFBF4] sm:text-lg">
              Salón Lizzy &amp; Sandra
            </h1>
          </div>

          <DesktopNav
            activeTab={activeTab}
            onChange={setActiveTab}
            hasCorteAlert={hasCorteAlert}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-5">
        {hasCorteAlert && activeTab !== 'cortes' && (
          <button
            type="button"
            onClick={() => setActiveTab('cortes')}
            className="mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-amber-500/15 px-4 py-3.5 text-left transition hover:bg-amber-500/20"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
              <div>
                <div className="text-sm font-extrabold text-amber-200">
                  Corte quincenal pendiente (8:00 PM)
                </div>
                <div className="text-xs text-amber-100/80">
                  Toca aquí para cerrar el período y guardar el historial.
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-[#11120D]">
              Ir a Quincena
            </span>
          </button>
        )}

        {loading ? (
          <div className="py-20 text-center text-sm text-[#9E9A8B]">Cargando sistema...</div>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-center"
          >
            <p className="text-sm font-semibold text-red-200">{loadError}</p>
            <button
              type="button"
              onClick={fetchState}
              className="mt-4 min-h-[44px] rounded-xl bg-[#D8CFBC] px-5 py-2.5 text-sm font-extrabold text-[#11120D]"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'register' && (
              <QuickRegister
                onSubmit={handleCreateJob}
                cajaSesion={state.cajaSesion}
                onAperturarCaja={handleAperturarCaja}
                onNavigateToCaja={() => setActiveTab('daily')}
              />
            )}
            {activeTab === 'vales' && (
              <ValesView
                vales={state.vales}
                gastos={state.gastos}
                onCreateVale={handleCreateVale}
                onDeleteVale={handleDeleteVale}
                onCreateGasto={handleCreateGasto}
                onDeleteGasto={handleDeleteGasto}
              />
            )}
            {activeTab === 'daily' && (
              <DailySummary
                jobs={state.jobs}
                vales={state.vales}
                gastos={state.gastos}
                cortesDiarios={state.cortesDiarios}
                cajaBases={state.cajaBases}
                cajaSesion={state.cajaSesion}
                onUpdateJob={handleUpdateJob}
                onDeleteJob={handleDeleteJob}
                onUpdateCajaBase={handleUpdateCajaBase}
                onCreateCorteDiario={handleCreateCorteDiario}
                onDeleteCorteDiario={handleDeleteCorteDiario}
                onAperturarCaja={handleAperturarCaja}
              />
            )}
            {activeTab === 'cortes' && (
              <CortesView
                jobs={state.jobs}
                vales={state.vales}
                gastos={state.gastos}
                cortes={state.cortes}
                quincena={state.quincena}
                onCloseCorte={handleCloseCorte}
              />
            )}
          </>
        )}
      </main>

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-[#D8CFBC] bg-[#1A1B15] px-4 py-2.5 text-sm font-extrabold text-[#FFFBF4] shadow-2xl sm:bottom-6"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <span>{toastMsg}</span>
        </div>
      )}

      <MobileNav
        activeTab={activeTab}
        onChange={setActiveTab}
        hasCorteAlert={hasCorteAlert}
      />
    </div>
  );
}
