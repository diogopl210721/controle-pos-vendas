import React, { useState } from "react";
import { Menu, Upload, Bell, Loader2 } from "lucide-react";
import { useContratosData } from "./lib/useContratosData";
import Sidebar from "./components/Sidebar";
import ClienteDrawer from "./components/ClienteDrawer";
import Dashboard from "./pages/Dashboard";
import CentralRenovacoes from "./pages/CentralRenovacoes";
import Contratos from "./pages/Contratos";
import Clientes from "./pages/Clientes";
import Consultores from "./pages/Consultores";
import Importacoes from "./pages/Importacoes";
import Configuracoes from "./pages/Configuracoes";

export default function App() {
  const { loading, erro, contratos, consultores, refetch } = useContratosData();
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selecionado, setSelecionado] = useState(null);

  const alertasUrgentes = contratos.filter((c) => c.dias >= 0 && c.dias <= 30).length;

  function navegar(v) {
    setView(v);
    setSidebarOpen(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-amber-400" size={20} />
        Carregando contratos do banco...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-slate-950 text-rose-300 flex items-center justify-center p-8 text-center">
        Erro ao carregar dados: {erro}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar view={view} onNavigate={navegar} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-300 -ml-1 p-1">
            <Menu size={22} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => navegar("importacoes")}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs sm:text-sm text-slate-200 px-3 sm:px-4 py-2 rounded-lg transition-colors"
            >
              <Upload size={15} /> <span className="hidden sm:inline">Importar Planilha</span>
            </button>
            <div className="relative w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
              <Bell size={15} className="text-slate-400" />
              {alertasUrgentes > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {alertasUrgentes}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 pb-10">
          {view === "dashboard" && <Dashboard contratos={contratos} onSelect={setSelecionado} />}
          {view === "central" && <CentralRenovacoes contratos={contratos} onSelect={setSelecionado} />}
          {view === "contratos" && <Contratos contratos={contratos} onSelect={setSelecionado} />}
          {view === "clientes" && <Clientes contratos={contratos} onSelect={setSelecionado} />}
          {view === "consultores" && <Consultores contratos={contratos} consultores={consultores} />}
          {view === "importacoes" && <Importacoes onImportado={refetch} />}
          {view === "config" && <Configuracoes consultores={consultores} />}
        </div>
      </main>

      <ClienteDrawer cliente={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  );
}
