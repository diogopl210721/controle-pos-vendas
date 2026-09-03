import React, { useState, useEffect, useCallback } from "react";
import { Menu, Upload, Bell, Loader2, ArrowLeft } from "lucide-react";
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

const VIEWS_VALIDAS = ["dashboard", "central", "contratos", "clientes", "consultores", "importacoes", "config"];

function viewFromHash() {
  const h = window.location.hash.replace("#", "");
  return VIEWS_VALIDAS.includes(h) ? h : "dashboard";
}

export default function App() {
  const { loading, erro, contratos, consultores, refetch } = useContratosData();
  const [view, setView] = useState(viewFromHash());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [filtroCentral, setFiltroCentral] = useState("todos");

  const alertasUrgentes = contratos.filter((c) => c.dias >= 0 && c.dias <= 30).length;

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, "", "#dashboard");
    const onPop = () => setView(viewFromHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navegar = useCallback((v) => {
    setView(v);
    setSidebarOpen(false);
    if (window.location.hash.replace("#", "") !== v) {
      window.history.pushState(null, "", "#" + v);
    }
  }, []);

  function navegarComFiltro(filtro) {
    setFiltroCentral(filtro);
    navegar("central");
  }

  function voltar() {
    window.history.back();
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
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-300 -ml-1 p-1">
              <Menu size={22} />
            </button>
            {view !== "dashboard" && (
              <button
                onClick={voltar}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 px-2 py-1 -ml-1"
              >
                <ArrowLeft size={17} /> <span className="hidden sm:inline">Voltar</span>
              </button>
            )}
          </div>
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
          {view === "dashboard" && <Dashboard contratos={contratos} onSelect={setSelecionado} onNavigateFiltro={navegarComFiltro} />}
          {view === "central" && <CentralRenovacoes contratos={contratos} onSelect={setSelecionado} filtroInicial={filtroCentral} />}
          {view === "contratos" && <Contratos contratos={contratos} onSelect={setSelecionado} />}
          {view === "clientes" && <Clientes contratos={contratos} onSelect={setSelecionado} />}
          {view === "consultores" && <Consultores contratos={contratos} consultores={consultores} />}
          {view === "importacoes" && <Importacoes onImportado={refetch} />}
          {view === "config" && <Configuracoes consultores={consultores} />}
        </div>
      </main>

      <ClienteDrawer cliente={selecionado} onClose={() => setSelecionado(null)} onAtualizado={refetch} />
    </div>
  );
}
