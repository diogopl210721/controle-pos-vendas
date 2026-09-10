import React, { useMemo, useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Clock, XCircle, TrendingDown, AlertTriangle, RefreshCw } from "lucide-react";
import ClientesTable from "../components/ClientesTable";
import { supabase } from "../supabaseClient";

const TONES = {
  amber: { icon: "text-amber-400 bg-amber-500/10 border-amber-500/20", bar: "bg-amber-500" },
  rose: { icon: "text-rose-400 bg-rose-500/10 border-rose-500/20", bar: "bg-rose-500" },
  teal: { icon: "text-teal-400 bg-teal-500/10 border-teal-500/20", bar: "bg-teal-500" },
  purple: { icon: "text-violet-400 bg-violet-500/10 border-violet-500/20", bar: "bg-violet-500" },
};

function KPICard({ icon: Icon, value, label, hint, tone, proporcao, onClick }) {
  const t = TONES[tone];
  return (
    <button
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 flex flex-col gap-3 text-left transition-colors overflow-hidden"
    >
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${t.icon}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-semibold text-slate-50 tabular-nums">{value}</div>
        <div className="text-sm text-slate-400 mt-0.5">{label}</div>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${t.bar} rounded-full`} style={{ width: `${Math.min(100, proporcao)}%` }} />
      </div>
      {hint && <div className="text-xs text-slate-500 hidden sm:block">{hint}</div>}
    </button>
  );
}

const FAIXAS_SCORE = [
  { key: "otimo", label: "Ótimo (80-100)", cor: "#2dd4bf", min: 80, max: 100 },
  { key: "bom", label: "Bom (60-79)", cor: "#38bdf8", min: 60, max: 79 },
  { key: "atencao", label: "Atenção (40-59)", cor: "#f59e0b", min: 40, max: 59 },
  { key: "risco", label: "Risco (0-39)", cor: "#fb7185", min: 0, max: 39 },
];

export default function Dashboard({ contratos, onSelect, onNavigateFiltro }) {
  const ativos = useMemo(() => contratos.filter((c) => !c.situacaoGestao), [contratos]);
  const pendenciasReativacao = useMemo(() => contratos.filter((c) => c.pendenteReativacao).length, [contratos]);

  const [scores, setScores] = useState([]);
  const [renovacoesMes, setRenovacoesMes] = useState(null);

  useEffect(() => {
    supabase
      .from("cpv_planos_ia")
      .select("contrato_id, score, gerado_em")
      .order("gerado_em", { ascending: false })
      .then(({ data }) => {
        const vistos = new Set();
        const ultimos = [];
        (data || []).forEach((d) => {
          if (!vistos.has(d.contrato_id)) {
            vistos.add(d.contrato_id);
            if (d.score != null) ultimos.push(d.score);
          }
        });
        setScores(ultimos);
      });

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    supabase
      .from("cpv_contratos")
      .select("id", { count: "exact", head: true })
      .eq("situacao_gestao", "renovado")
      .gte("situacao_atualizada_em", inicioMes.toISOString())
      .then(({ count }) => setRenovacoesMes(count ?? 0));
  }, [contratos]);

  const stats = useMemo(() => {
    const vencidos = ativos.filter((c) => c.dias < 0).length;
    const d95 = ativos.filter((c) => c.dias >= 0 && c.dias <= 95).length;
    const d150 = ativos.filter((c) => c.dias >= 0 && c.dias <= 150).length;
    const d180 = ativos.filter((c) => c.dias >= 0 && c.dias <= 180).length;
    const pendenteConsultorUrgente = ativos.filter(
      (c) => c.dias >= 0 && c.dias <= 180 && c.consultor === "Pendente consultor"
    ).length;
    return { total: contratos.length, vencidos, d95, d150, d180, pendenteConsultorUrgente };
  }, [contratos, ativos]);

  const distVencimentos = useMemo(() => {
    const buckets = [
      { faixa: "0-30", lo: 0, hi: 30 },
      { faixa: "31-60", lo: 31, hi: 60 },
      { faixa: "61-95", lo: 61, hi: 95 },
      { faixa: "96-150", lo: 96, hi: 150 },
      { faixa: "151-180", lo: 151, hi: 180 },
      { faixa: "181-365", lo: 181, hi: 365 },
    ];
    return buckets.map((b) => ({ faixa: b.faixa, qtd: ativos.filter((c) => c.dias >= b.lo && c.dias <= b.hi).length }));
  }, [ativos]);

  const cargaConsultores = useMemo(() => {
    const map = {};
    ativos.filter((c) => c.dias >= 0 && c.dias <= 180).forEach((c) => {
      map[c.consultor] = (map[c.consultor] || 0) + 1;
    });
    return Object.entries(map).map(([consultor, qtd]) => ({ consultor, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 8);
  }, [ativos]);

  const distScore = useMemo(() => {
    return FAIXAS_SCORE.map((f) => ({
      ...f,
      qtd: scores.filter((s) => s >= f.min && s <= f.max).length,
    }));
  }, [scores]);
  const mediaScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Base real: {stats.total.toLocaleString("pt-BR")} contratos no Supabase</p>
      </div>

      {pendenciasReativacao > 0 && (
        <button
          onClick={() => onNavigateFiltro("pendentes")}
          className="flex items-center gap-3 bg-sky-500/[0.06] hover:bg-sky-500/[0.1] border border-sky-500/20 rounded-xl px-4 sm:px-5 py-3 text-left transition-colors"
        >
          <AlertTriangle size={17} className="text-sky-400 shrink-0" />
          <p className="text-sm text-sky-200">
            <strong className="font-semibold">{pendenciasReativacao} contrato(s)</strong> voltaram a aparecer na
            última planilha marcados como encerrado/perdido — precisam da sua confirmação.
          </p>
        </button>
      )}

      {stats.d180 > 0 && stats.pendenteConsultorUrgente > 0 && (
        <button
          onClick={() => onNavigateFiltro("180")}
          className="flex items-center gap-3 bg-amber-500/[0.06] hover:bg-amber-500/[0.1] border border-amber-500/20 rounded-xl px-4 sm:px-5 py-3 text-left transition-colors"
        >
          <AlertTriangle size={17} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">
            <strong className="font-semibold">{stats.pendenteConsultorUrgente} de {stats.d180}</strong> clientes que vencem
            nos próximos 180 dias estão com <strong className="font-semibold">consultor pendente</strong>.
          </p>
        </button>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard icon={Clock} tone="amber" value={stats.d150} label="Em 150 dias" hint="Iniciar abordagem" proporcao={stats.total ? (stats.d150 / stats.total) * 100 : 0} onClick={() => onNavigateFiltro("150")} />
        <KPICard icon={Clock} tone="amber" value={stats.d95} label="Em 95 dias" hint="Abordagem ativa" proporcao={stats.total ? (stats.d95 / stats.total) * 100 : 0} onClick={() => onNavigateFiltro("95")} />
        <KPICard icon={TrendingDown} tone="teal" value={stats.d180} label="Próx. 180 dias" hint="Janela de planejamento" proporcao={stats.total ? (stats.d180 / stats.total) * 100 : 0} onClick={() => onNavigateFiltro("180")} />
        <KPICard icon={XCircle} tone="rose" value={stats.vencidos} label="Vencidos" hint="Ação imediata" proporcao={stats.total ? (stats.vencidos / stats.total) * 100 : 0} onClick={() => onNavigateFiltro("vencidos")} />
      </div>

      <ClientesTable contratos={contratos} onSelect={onSelect} porPagina={10} titulo="Clientes que precisam de ação" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Volume de vencimentos por faixa</h3>
          <p className="text-xs text-slate-500 mb-4">Contratos ativos (sem contar encerrados/perdidos/transferidos)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distVencimentos} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="faixa" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} />
              <Bar dataKey="qtd" radius={[4, 4, 0, 0]}>
                {distVencimentos.map((d, i) => (<Cell key={i} fill={i <= 3 ? "#f59e0b" : "#334155"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Carga por consultor (próx. 180 dias)</h3>
          <p className="text-xs text-slate-500 mb-4">Quem precisa priorizar a agenda agora</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cargaConsultores} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="consultor" stroke="#64748b" fontSize={10.5} width={120} tickLine={false} axisLine={false}
                tickFormatter={(v) => (v.length > 15 ? v.slice(0, 14) + "…" : v)} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} />
              <Bar dataKey="qtd" radius={[0, 4, 4, 0]}>
                {cargaConsultores.map((d, i) => (<Cell key={i} fill={d.consultor === "Pendente consultor" ? "#fb923c" : "#2dd4bf"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Score de Renovação</h3>
          <p className="text-xs text-slate-500 mb-4">
            {scores.length > 0 ? `Baseado em ${scores.length} dossiê(s) já gerados pela IA` : "Ainda não há dossiês gerados — gere um na ficha de um cliente"}
          </p>
          {scores.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={distScore} dataKey="qtd" nameKey="label" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {distScore.map((f, i) => <Cell key={i} fill={f.cor} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                <div className="text-xs text-slate-500 mb-1">Média geral <span className="text-slate-200 font-semibold">{mediaScore}/100</span></div>
                {distScore.map((f) => (
                  <div key={f.key} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full" style={{ background: f.cor }} />
                    {f.label} <span className="text-slate-300 tabular-nums">{scores.length ? Math.round((f.qtd / scores.length) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-lg">
              Sem dossiês ainda
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">Renovações este mês</h3>
          <p className="text-xs text-slate-500 mb-4">Contratos marcados como "Renovado" desde o dia 1º</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <RefreshCw size={20} />
            </div>
            <div className="text-3xl font-semibold text-slate-50 tabular-nums">{renovacoesMes ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
