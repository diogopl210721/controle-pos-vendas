import React from "react";
import {
  Flame, X, LayoutGrid, Users, Upload,
} from "lucide-react";

const ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "consultores", label: "Consultores", icon: Users },
  { key: "importacoes", label: "Importações", icon: Upload },
];

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
        active ? "bg-amber-500/10 text-amber-300" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
      }`}
    >
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}

export default function Sidebar({ view, onNavigate, open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:static top-0 left-0 h-full w-72 lg:w-60 shrink-0 border-r border-slate-800
          bg-slate-950 flex flex-col p-4 gap-6 z-40 transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0">
              <Flame size={18} className="text-slate-950" />
            </div>
            <div>
              <div className="font-semibold text-slate-50 leading-tight">Controle Pós Vendas</div>
              <div className="text-[11px] text-slate-500 leading-tight">Consigaz</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {ITEMS.map((item) => (
            <NavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={view === item.key}
              onClick={() => onNavigate(item.key)}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
