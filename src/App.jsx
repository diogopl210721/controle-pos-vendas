import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Flame, Search, Upload, Bell, MapPin, Phone, Navigation, X, ChevronRight,
  AlertTriangle, Clock, XCircle, TrendingDown, CheckCircle2, LayoutGrid,
  ListChecks, FileText, Users, Fuel, Settings, Loader2,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const PRAZO_OPTS = [
  { key: "todos", label: "Todos" },
  { key: "vencidos", label: "Vencidos" },
  { key: "30", label: "30 dias" },
  { key: "60", label: "60 dias" },
  { key: "95", label: "95 dias" },
  { key: "150", label: "150 dias" },
];

function diasParaVencer(dataTermino) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataTermino + "T00:00:00");
  return Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
}

function prioridade(dias) {
  if (dias < 0) return { label: "Vencido", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
  if (dias <= 30) return { label: "30 dias", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
  if (dias <= 95) return { label: "95 dias", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  if (dias <= 150) return { label: "150 dias", cls: "bg-amber-400/10 text-amber-200 border-amber-400/20" };
  return { label: `${dias} dias`, cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" };
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function KPICard({ icon: Icon, value, label, hint, tone }) {
  const tones = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    teal: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    slate: "text-slate-300 bg-slate-500/10 border-slate-500/20",
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-3xl font-semibold text-slate-50 tabular-nums">{value}</div>
        <div className="text-sm text-slate-400 mt-0.5">{label}</div>
      </div>
      {hint && <div className="text-xs text-slate-500 pt-1 border-t border-slate-800">{hint}</div>}
    </div>
  );
}

function NavItem({ icon: Icon, label, active }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
      active ? "bg-amber-500/10 text-amber-300" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
    }`}>
      <Icon size={17} />
      <span>{label}</span>
    </div>
  );
}

function DadoIndisponivel({ label }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-xs text-slate-600 italic">aguardando planilha</span>
    </div>
  );
}

function Dado({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-200 text-right">{value}</span>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [contratos, setContratos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [pagina, setPagina] = useState(1);
  const porPagina = 20;

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data, error } = await supabase
        .from("cpv_contratos")
        .select(`
          id, numero_contrato, data_inicio, data_termino, prazo_meses, canal_venda,
          cliente:cpv_clientes ( codigo_cliente, nome, bairro, cidade, uf ),
          consultor:cpv_consultores ( nome )
        `)
        .order("data_termino", { ascending: true })
        .limit(2000);

      if (error) {
        setErro(error.message);
        setLoading(false);
        return;
      }

      const linhas = (data || []).map((c) => ({
        id: c.id,
        codigo: c.cliente?.codigo_cliente ?? "-",
        nome: c.cliente?.nome ?? "Cliente sem nome",
        bairro: c.cliente?.bairro ?? "",
        cidade: c.cliente?.cidade ?? "",
        uf: c.cliente?.uf ?? "",
        contrato: c.numero_contrato,
        inicio: c.data_inicio,
        venc: c.data_termino,
        prazo: c.prazo_meses,
        canal: c.canal_venda,
        consultor: c.consultor?.nome ?? "Pendente consultor",
        dias: diasParaVencer(c.data_termino),
      }));

      setContratos(linhas);
      setLoading(false);
    }
    carregar();
  }, []);

  const stats = useMemo(() => {
    const vencidos = contratos.filter((c) => c.dias < 0).length;
    const d30 = contratos.filter((c) => c.dias >= 0 && c.dias <= 30).length;
    const d95 = contratos.filter((c) => c.dias >= 0 && c.dias <= 95).length;
    const d150 = contratos.filter((c) => c.dias >= 0 && c.dias <= 150).length;
    const d180 = contratos.filter((c) => c.dias >= 0 && c.dias <= 180).length;
    const pendenteConsultorUrgente = contratos.filter(
      (c) => c.dias >= 0 && c.dias <= 180 && c.consultor === "Pendente consultor"
    ).length;
    return { total: contratos.length, vencidos, d30, d95, d150, d180, pendenteConsultorUrgente };
  }, [contratos]);

  const distVencimentos = useMemo(() => {
    const buckets = [
      { faixa: "0-30", lo: 0, hi: 30 },
      { faixa: "31-60", lo: 31, hi: 60 },
      { faixa: "61-95", lo: 61, hi: 95 },
      { faixa: "96-150", lo: 96, hi: 150 },
      { faixa: "151-180", lo: 151, hi: 180 },
      { faixa: "181-365", lo: 181, hi: 365 },
    ];
    return buckets.map((b) => ({
      faixa: b.faixa,
      qtd: contratos.filter((c) => c.dias >= b.lo && c.dias <= b.hi).length,
    }));
  }, [contratos]);

  const cargaConsultores = useMemo(() => {
    const map = {};
    contratos
      .filter((c) => c.dias >= 0 && c.dias <= 180)
      .forEach((c) => {
        map[c.consultor] = (map[c.consultor] || 0) + 1;
      });
    return Object.entries(map)
      .map(([consultor, qtd]) => ({ consultor, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 8);
  }, [contratos]);

  const filtrados = useMemo(() => {
    let lista = contratos;
    if (filtro === "vencidos") lista = lista.filter((c) => c.dias < 0);
    else if (filtro !== "todos") {
      const limite = parseInt(filtro, 10);
      lista = lista.filter((c) => c.dias >= 0 && c.dias <= limite);
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.codigo.includes(q) ||
          c.cidade.toLowerCase().includes(q) ||
          c.consultor.toLowerCase().includes(q)
      );
    }
    return [...lista].sort((a, b) => a.dias - b.dias);
  }, [contratos, filtro, busca]);

  useEffect(() => setPagina(1), [filtro, busca]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const pageItems = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);

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
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      <aside className="w-60 shrink-0 border-r border-slate-800 flex flex-col p-4 gap-6">
        <div className="flex items-center gap-2 px-2 pt-1">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            <Flame size={18} className="text-slate-950" />
          </div>
          <div>
            <div className="font-semibold text-slate-50 leading-tight">Controle Pós Vendas</div>
            <div className="text-[11px] text-slate-500 leading-tight">Consigaz</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <NavItem icon={LayoutGrid} label="Dashboard" active />
          <NavItem icon={ListChecks} label="Central de Renovações" />
          <NavItem icon={FileText} label="Contratos" />
          <NavItem icon={Users} label="Clientes" />
          <NavItem icon={Fuel} label="Consumo" />
          <NavItem icon={Users} label="Consultores" />
          <NavItem icon={Upload} label="Importações" />
          <NavItem icon={Settings} label="Configurações" />
        </nav>

        <div className="mt-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium mb-1">
              <Upload size={14} /> Importação
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Suba a planilha atualizada e o sistema recalcula tudo.
            </p>
            <button
              onClick={() => setShowImport(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-medium py-2 rounded-lg transition-colors"
            >
              Importar planilha
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Base real: {stats.total.toLocaleString("pt-BR")} contratos no Supabase
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-sm text-slate-200 px-4 py-2 rounded-lg transition-colors"
            >
              <Upload size={15} /> Importar Planilha
            </button>
            <div className="relative w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Bell size={15} className="text-slate-400" />
              {stats.d30 > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {stats.d30}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 pb-10 flex flex-col gap-6">
          {stats.d180 > 0 && stats.pendenteConsultorUrgente > 0 && (
            <div className="flex items-center gap-3 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-5 py-3">
              <AlertTriangle size={17} className="text-amber-400 shrink-0" />
              <p className="text-sm text-amber-200">
                <strong className="font-semibold">{stats.pendenteConsultorUrgente} de {stats.d180}</strong> clientes que
                vencem nos próximos 180 dias estão com <strong className="font-semibold">consultor pendente</strong> —
                vale distribuir antes de virar urgência.
              </p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            <KPICard icon={Clock} tone="amber" value={stats.d150} label="Clientes em 150 dias" hint="Ação recomendada: iniciar abordagem" />
            <KPICard icon={Clock} tone="amber" value={stats.d95} label="Clientes em 95 dias" hint="Ação recomendada: abordagem ativa" />
            <KPICard icon={TrendingDown} tone="teal" value={stats.d180} label="Próximos 180 dias" hint="Janela total de planejamento" />
            <KPICard icon={XCircle} tone="rose" value={stats.vencidos} label="Contratos vencidos" hint="Ação imediata necessária" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between p-5 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-50">Clientes que precisam de ação</h2>
                <p className="text-xs text-slate-500 mt-0.5">{filtrados.length} de {stats.total} contratos</p>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente, código, cidade ou consultor..."
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 w-80 outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 pb-4">
              {PRAZO_OPTS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFiltro(opt.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    filtro === opt.key
                      ? "bg-amber-500 text-slate-950 border-amber-500 font-medium"
                      : "bg-transparent text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs border-y border-slate-800">
                    <th className="font-medium py-2.5 px-5">Prioridade</th>
                    <th className="font-medium py-2.5 px-3">Código</th>
                    <th className="font-medium py-2.5 px-3">Cliente</th>
                    <th className="font-medium py-2.5 px-3">Cidade</th>
                    <th className="font-medium py-2.5 px-3">Consultor</th>
                    <th className="font-medium py-2.5 px-3">Vencimento</th>
                    <th className="font-medium py-2.5 px-3">Dias</th>
                    <th className="font-medium py-2.5 px-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => {
                    const p = prioridade(c.dias);
                    const pendente = c.consultor === "Pendente consultor";
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelecionado(c)}
                        className="border-b border-slate-800/60 hover:bg-slate-800/30 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-5">
                          <span className={`text-[11px] px-2 py-1 rounded-md border ${p.cls}`}>{p.label}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 tabular-nums">{c.codigo}</td>
                        <td className="py-2.5 px-3 text-slate-100 max-w-[220px] truncate">{c.nome}</td>
                        <td className="py-2.5 px-3 text-slate-400">{c.cidade}</td>
                        <td className={`py-2.5 px-3 ${pendente ? "text-amber-400" : "text-slate-400"}`}>{c.consultor}</td>
                        <td className="py-2.5 px-3 text-slate-400 tabular-nums">{formatDate(c.venc)}</td>
                        <td className={`py-2.5 px-3 tabular-nums font-medium ${c.dias < 0 ? "text-rose-400" : "text-slate-200"}`}>
                          {c.dias < 0 ? `${Math.abs(c.dias)}d atrás` : c.dias}
                        </td>
                        <td className="py-2.5 px-5 text-right">
                          <ChevronRight size={15} className="text-slate-600" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtrados.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-10">Nenhum contrato encontrado para esse filtro.</div>
              )}
              {filtrados.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
                  <span>Página {pagina} de {totalPaginas}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={pagina <= 1}
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-md border border-slate-800 disabled:opacity-30"
                    >
                      Anterior
                    </button>
                    <button
                      disabled={pagina >= totalPaginas}
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      className="px-3 py-1 rounded-md border border-slate-800 disabled:opacity-30"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Volume de vencimentos por faixa</h3>
              <p className="text-xs text-slate-500 mb-4">Todos os {stats.total.toLocaleString("pt-BR")} contratos da base</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distVencimentos} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="faixa" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} />
                  <Bar dataKey="qtd" radius={[4, 4, 0, 0]}>
                    {distVencimentos.map((d, i) => (
                      <Cell key={i} fill={i <= 3 ? "#f59e0b" : "#334155"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Carga por consultor (próx. 180 dias)</h3>
              <p className="text-xs text-slate-500 mb-4">Quem precisa priorizar a agenda de visitas agora</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cargaConsultores} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="consultor"
                    stroke="#64748b"
                    fontSize={10.5}
                    width={130}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v.length > 16 ? v.slice(0, 15) + "…" : v)}
                  />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} />
                  <Bar dataKey="qtd" radius={[0, 4, 4, 0]}>
                    {cargaConsultores.map((d, i) => (
                      <Cell key={i} fill={d.consultor === "Pendente consultor" ? "#fb923c" : "#2dd4bf"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>

      {selecionado && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelecionado(null)} />
          <div className="relative w-[420px] bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-semibold text-slate-50 pr-6">{selecionado.nome}</h2>
              <button onClick={() => setSelecionado(null)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <span className={`text-[11px] px-2 py-1 rounded-md border ${prioridade(selecionado.dias).cls}`}>
                {prioridade(selecionado.dias).label}
              </span>
              <span className="text-xs text-slate-500">Código {selecionado.codigo}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contrato</h3>
              <Dado label="Número do contrato" value={selecionado.contrato} />
              <Dado label="Canal de venda" value={selecionado.canal} />
              <Dado label="Início" value={formatDate(selecionado.inicio)} />
              <Dado label="Vencimento" value={formatDate(selecionado.venc)} />
              <Dado label="Prazo" value={`${selecionado.prazo} meses`} />
              <Dado label="Consultor" value={selecionado.consultor} />
              <Dado label="Localização" value={`${selecionado.bairro ? selecionado.bairro + ", " : ""}${selecionado.cidade} - ${selecionado.uf}`} />
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tancagem</h3>
              <DadoIndisponivel label="Quantidade e tipo de tanques" />
              <DadoIndisponivel label="Capacidade total instalada" />
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Consumo</h3>
              <DadoIndisponivel label="Consumo médio mensal" />
              <DadoIndisponivel label="Histórico 12 meses" />
              <DadoIndisponivel label="Tendência" />
            </div>

            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ações rápidas</h3>
              <div className="grid grid-cols-3 gap-2">
                <button disabled className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg py-3 text-slate-600 cursor-not-allowed">
                  <Phone size={16} />
                  <span className="text-[11px]">Sem telefone</span>
                </button>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(selecionado.nome + " " + selecionado.cidade)}`}
                  target="_blank" rel="noreferrer"
                  className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 hover:border-teal-500/40 rounded-lg py-3 text-teal-400"
                >
                  <MapPin size={16} />
                  <span className="text-[11px]">Maps (aprox.)</span>
                </a>
                <button disabled className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg py-3 text-slate-600 cursor-not-allowed">
                  <Navigation size={16} />
                  <span className="text-[11px]">Sem endereço</span>
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-1">
                <Flame size={15} /> Dossiê de Renovação (IA)
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                O dossiê completo (score, roteiro, objeções, próximo passo) depende dos dados de tancagem e consumo,
                que ainda não estão na base. Assim que a planilha vier, esse botão gera a análise real com a IA.
              </p>
              <button disabled className="w-full bg-slate-800 text-slate-500 text-xs font-medium py-2.5 rounded-lg cursor-not-allowed">
                Preparar visita com IA — aguardando dados
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowImport(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 w-[420px]">
            <div className="flex items-center gap-2 text-amber-300 mb-1">
              <Upload size={17} />
              <h3 className="font-semibold text-slate-50">Importação Inteligente</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Ainda não conectada. Por enquanto, {stats.total.toLocaleString("pt-BR")} contratos foram importados
              manualmente para validar o schema. A próxima etapa é montar este fluxo de verdade:
              upload → IA mapeia colunas → você confere → importa.
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {["Nome do cliente → nome_cliente (99%)", "Data de término do contrato → data_vencimento (100%)", "NOME - REP 2 → consultor (94%)"].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                  <CheckCircle2 size={13} className="text-teal-400 shrink-0" /> {t}
                </div>
              ))}
            </div>
            <button onClick={() => setShowImport(false)} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-medium py-2.5 rounded-lg transition-colors">
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
