import React, { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import { formatDate, prioridade } from "../lib/format";
import PaginacaoControles from "../components/PaginacaoControles";

const POR_PAGINA = 30;

export default function Clientes({ contratos, onSelect }) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const porCliente = useMemo(() => {
    const maisProximo = {};
    const counts = {};
    contratos.forEach((c) => {
      counts[c.codigo] = (counts[c.codigo] || 0) + 1;
      if (!maisProximo[c.codigo] || c.dias < maisProximo[c.codigo].dias) maisProximo[c.codigo] = c;
    });
    return Object.values(maisProximo)
      .map((c) => ({ ...c, qtdContratos: counts[c.codigo] }))
      .sort((a, b) => a.dias - b.dias);
  }, [contratos]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return porCliente;
    const q = busca.toLowerCase();
    return porCliente.filter((c) => c.nome.toLowerCase().includes(q) || c.codigo.includes(q) || c.cidade.toLowerCase().includes(q));
  }, [porCliente, busca]);

  useEffect(() => setPagina(1), [busca]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const pageItems = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">{porCliente.length} clientes únicos</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, código ou cidade..."
            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 w-full sm:w-80 outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
              <th className="font-medium py-2.5 px-4">Código</th>
              <th className="font-medium py-2.5 px-3">Cliente</th>
              <th className="font-medium py-2.5 px-3">Cidade</th>
              <th className="font-medium py-2.5 px-3">Consultor</th>
              <th className="font-medium py-2.5 px-3">Contratos</th>
              <th className="font-medium py-2.5 px-3">Próx. vencimento</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => (
              <tr key={c.codigo} onClick={() => onSelect(c)} className="border-b border-slate-800/60 hover:bg-slate-800/30 cursor-pointer">
                <td className="py-2.5 px-4 text-slate-400 tabular-nums">{c.codigo}</td>
                <td className="py-2.5 px-3 text-slate-100 max-w-[220px] truncate">{c.nome}</td>
                <td className="py-2.5 px-3 text-slate-400">{c.cidade}</td>
                <td className="py-2.5 px-3 text-slate-400">{c.consultor}</td>
                <td className="py-2.5 px-3 text-slate-400 tabular-nums">{c.qtdContratos}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-[11px] px-2 py-1 rounded-md border ${prioridade(c.dias).cls}`}>{formatDate(c.venc)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-10">Nenhum cliente encontrado.</div>
        )}
        <PaginacaoControles
          pagina={pagina}
          totalPaginas={totalPaginas}
          onAnterior={() => setPagina((p) => Math.max(1, p - 1))}
          onProxima={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
        />
      </div>
    </div>
  );
}
