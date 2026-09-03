import React from "react";
import { X, MapPin, Phone, Navigation, Flame } from "lucide-react";
import { prioridade, formatDate } from "../lib/format";

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

export default function ClienteDrawer({ cliente, onClose }) {
  if (!cliente) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:w-[420px] bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-50 pr-6">{cliente.nome}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-6">
          <span className={`text-[11px] px-2 py-1 rounded-md border ${prioridade(cliente.dias).cls}`}>
            {prioridade(cliente.dias).label}
          </span>
          <span className="text-xs text-slate-500">Código {cliente.codigo}</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contrato</h3>
          <Dado label="Número do contrato" value={cliente.contrato} />
          <Dado label="Canal de venda" value={cliente.canal} />
          <Dado label="Início" value={formatDate(cliente.inicio)} />
          <Dado label="Vencimento" value={formatDate(cliente.venc)} />
          <Dado label="Prazo" value={`${cliente.prazo} meses`} />
          <Dado label="Consultor" value={cliente.consultor} />
          <Dado label="Localização" value={`${cliente.bairro ? cliente.bairro + ", " : ""}${cliente.cidade} - ${cliente.uf}`} />
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
              href={`https://www.google.com/maps/search/${encodeURIComponent(cliente.nome + " " + cliente.cidade)}`}
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
  );
}
