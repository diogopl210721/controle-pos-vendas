import React, { useState, useEffect, useCallback } from "react";
import { Menu, Loader2, ArrowLeft } from "lucide-react";
import { useContratosData } from "./lib/useContratosData";
import Sidebar from "./components/Sidebar";
import ClienteDrawer from "./components/ClienteDrawer";
import Dashboard from "./pages/Dashboard";
import CentralRenovacoes from "./pages/CentralRenovacoes";
import Contratos from "./pages/Contratos";
import Clientes from "./pages/Clientes";
import Consultores from "./pages/Consultores";
import Importacoes from "./pages/Importacoes";

const VIEWS_VALIDAS = ["dashboard", "central", "contratos", "clientes", "consultores", "importacoes"];

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
        <div className="flex items-center px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
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

        <div className="px-4 sm:px-8 pb-10">
          {view === "dashboard" && <Dashboard contratos={contratos} onSelect={setSelecionado} onNavigateFiltro={navegarComFiltro} />}
          {view === "central" && <CentralRenovacoes contratos={contratos} onSelect={setSelecionado} filtroInicial={filtroCentral} />}
          {view === "contratos" && <Contratos contratos={contratos} onSelect={setSelecionado} />}
          {view === "clientes" && <Clientes contratos={contratos} onSelect={setSelecionado} />}
          {view === "consultores" && <Consultores contratos={contratos} consultores={consultores} />}
          {view === "importacoes" && <Importacoes onImportado={refetch} />}
        </div>
      </main>

      <ClienteDrawer cliente={selecionado} onClose={() => setSelecionado(null)} onAtualizado={refetch} />
    </div>
  );
}
