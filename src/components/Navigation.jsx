import { ArrowDownCircle, CalendarCheck, PlusCircle, Wallet } from 'lucide-react';

const TABS = [
  { id: 'register', label: 'Registrar', icon: PlusCircle },
  { id: 'vales', label: 'Vales', icon: ArrowDownCircle },
  { id: 'daily', label: 'Caja', icon: Wallet },
  { id: 'cortes', label: 'Quincena', icon: CalendarCheck },
];

export function DesktopNav({ activeTab, onChange, hasCorteAlert }) {
  return (
    <nav aria-label="Navegación principal" className="hidden sm:flex sm:items-center sm:gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              active
                ? 'bg-[#D8CFBC] text-[#11120D]'
                : 'border border-[#565449]/60 bg-[#1A1B15] text-[#D8CFBC] hover:border-[#D8CFBC]/60 hover:text-[#FFFBF4]'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
            {tab.id === 'cortes' && hasCorteAlert && (
              <span
                aria-label="Corte pendiente"
                className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#11120D]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileNav({ activeTab, onChange, hasCorteAlert }) {
  return (
    <nav
      aria-label="Navegación móvil"
      className="safe-pb fixed inset-x-0 bottom-0 z-40 border-t border-[#565449]/60 bg-[#1A1B15] px-2 pt-2 sm:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(tab.id)}
              className={`relative flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl py-2 transition active:scale-95 ${
                active
                  ? 'bg-[#D8CFBC]/20 text-[#FFFBF4]'
                  : 'text-[#9E9A8B] hover:text-[#D8CFBC]'
              }`}
            >
              <div className="relative">
                <Icon className={`h-6 w-6 ${active ? 'text-[#D8CFBC]' : ''}`} aria-hidden="true" />
                {tab.id === 'cortes' && hasCorteAlert && (
                  <span
                    aria-label="Corte pendiente"
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#1A1B15]"
                  />
                )}
              </div>
              <span className="text-[11px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
