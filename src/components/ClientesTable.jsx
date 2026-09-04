import React, { useState, useMemo, useEffect } from "react";
import { Search, ChevronRight, AlertTriangle } from "lucide-react";
import { prioridade, formatDate } from "../lib/format";

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "pendentes", label: "Pendências" },
  { key: "vencidos", label: "Vencidos" },
  { key: "30", label: "30 dias" },
  { key: "95", label: "95 dias" },
  { key: "150", label: "150 dias" },
  { key: "180", label: "180 dias" },
  { key: "fechados", label: "Encerrados/Perdidos" },
];

export function useClientesRollup(contratos) {
  return useMemo(() => {
    const map = {};
    contratos.forEach((c) => {
      if (!map[c.codigo]) {
        map[c.codigo] = {
          codigo: c.codigo,
          clienteId: c.clienteId,
          nome: c.nome,
          bairro: c.bairro,
          cidade: c.cidade,
          uf: c.uf,
          documento: c.documento,
          endereco: c.endereco,
          telefone: c.telefone,
          whatsapp: c.whatsapp,
          consultor: c.consultor,
          contratos: [],
        };
      }
      map[c.codigo].contratos.push(c);
    });
    return Object.values(map).map((cli) => {
      const ativos = cli.contratos.filter((c) => !c.situacaoGestao);
      const maisUrgente = ativos.length ? ativos.reduce((a, b) => (a.dias < b.dias ? a : b)) : null;
      const pendencias = cli.contratos.filter((c) => c.pendenteReativacao).length;
      const temFechado = cli.contratos.some((c) => c.situacaoGestao);
      return { ...cli, qtdContratos: cli.contratos.length, maisUrgente, pendencias, temFechado };
    });
  }, [contratos]);
}

export default function ClientesTable({
  contratos,
  onSelect,
  porPagina = 30,
  titulo = "Clientes",
  filtroInicial = "todos",
  mostrarFiltroConsultor = false,
}) {
  const porCliente = useClientesRollup(contratos);
  const [filtro, setFiltro] = useState(filtroInicial);
  const [busca, setBusca] = useState("");
  const [consultorFiltro, setConsultorFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const consultoresUnicos = useMemo(() => {
    const set = new Set(porCliente.map((c) => c.consultor));
    return ["todos", ...Array.from(set).sort()];
  }, [porCliente]);

  const filtrados = useMemo(() => {
    let lista = porCliente;
    if (filtro === "vencidos") lista = lista.filter((c) => c.maisUrgente && c.maisUrgente.dias < 0);
    else if (filtro === "pendentes") lista = lista.filter((c) => c.pendencias > 0);
    else if (filtro === "fechados") lista = lista.filter((c) => c.temFechado);
    else if (filtro !== "todos") {
      const limite = parseInt(filtro, 10);
      lista = lista.filter((c) => c.maisUrgente && c.maisUrgente.dias >= 0 && c.maisUrgente.dias <= limite);
    }
    if (mostrarFiltroConsultor && consultorFiltro !== "todos") {
      lista = lista.filter((c) => c.consultor === consultorFiltro);
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
    return [...lista].sort((a, b) => {
      if (a.pendencias !== b.pendencias) return b.pendencias - a.pendencias;
      const da = a.maisUrgente ? a.maisUrgente.dias : Infinity;
      const db = b.maisUrgente ? b.maisUrgente.dias : Infinity;
      return da - db;
    });
  }, [porCliente, filtro, busca, consultorFiltro, mostrarFiltroConsultor]);

  useEffect(() => setPagina(1), [filtro, busca, consultorFiltro]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const pageItems = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-50">{titulo}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{filtrados.length} de {porCliente.length} clientes</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, código, cidade ou consultor..."
            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 w-full sm:w-80 outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pb-4">
        {FILTROS.map((opt) => (
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
        {mostrarFiltroConsultor && (
          <select
            value={consultorFiltro}
            onChange={(e) => setConsultorFiltro(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 outline-none"
          >
            {consultoresUnicos.map((c) => (
              <option key={c} value={c}>{c === "todos" ? "Todos os consultores" : c}</option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-slate-500 text-xs border-y border-slate-800">
              <th className="font-medium py-2.5 px-4 sm:px-5">Status</th>
              <th className="font-medium py-2.5 px-3">Código</th>
              <th className="font-medium py-2.5 px-3">Cliente</th>
              <th className="font-medium py-2.5 px-3">Cidade</th>
              <th className="font-medium py-2.5 px-3">Consultor</th>
              <th className="font-medium py-2.5 px-3">Contratos</th>
              <th className="font-medium py-2.5 px-3">Próx. vencimento</th>
              <th className="font-medium py-2.5 px-4 sm:px-5"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => {
              const badge = c.maisUrgente ? prioridade(c.maisUrgente.dias) : { label: "Sem contrato ativo", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
              const pendente = c.consultor === "Pendente consultor";
              return (
                <tr
                  key={c.codigo}
                  onClick={() => onSelect(c.codigo)}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4 sm:px-5">
                    <span className={`text-[11px] px-2 py-1 rounded-md border ${badge.cls}`}>{badge.label}</span>
                    {c.pendencias > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] px-1.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <AlertTriangle size={10} /> {c.pendencias}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 tabular-nums">{c.codigo}</td>
                  <td className="py-2.5 px-3 text-slate-100 max-w-[220px] truncate">{c.nome}</td>
                  <td className="py-2.5 px-3 text-slate-400">{c.cidade}</td>
                  <td className={`py-2.5 px-3 ${pendente ? "text-amber-400" : "text-slate-400"}`}>{c.consultor}</td>
                  <td className="py-2.5 px-3 text-slate-400 tabular-nums">{c.qtdContratos}</td>
                  <td className="py-2.5 px-3 text-slate-400 tabular-nums">{c.maisUrgente ? formatDate(c.maisUrgente.venc) : "—"}</td>
                  <td className="py-2.5 px-4 sm:px-5 text-right">
                    <ChevronRight size={15} className="text-slate-600" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-10">Nenhum cliente encontrado para esse filtro.</div>
        )}
        {filtrados.length > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 text-xs text-slate-500">
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
  );
}
