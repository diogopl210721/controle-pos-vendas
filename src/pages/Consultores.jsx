import React, { useMemo } from "react";
import { Users } from "lucide-react";

export default function Consultores({ contratos, consultores }) {
  const porConsultor = useMemo(() => {
    const map = {};
    contratos.forEach((c) => {
      if (!map[c.consultor]) map[c.consultor] = { nome: c.consultor, total: 0, urgente: 0, vencidos: 0 };
      map[c.consultor].total += 1;
      if (c.dias >= 0 && c.dias <= 180) map[c.consultor].urgente += 1;
      if (c.dias < 0) map[c.consultor].vencidos += 1;
    });
    return Object.values(map).sort((a, b) => b.urgente - a.urgente);
  }, [contratos]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Consultores</h1>
        <p className="text-sm text-slate-500 mt-1">{consultores.length} cadastrados · carteira calculada a partir dos contratos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {porConsultor.map((c) => (
          <div key={c.nome} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                <Users size={15} />
              </div>
              <span className={`text-sm font-medium ${c.nome === "Pendente consultor" ? "text-amber-400" : "text-slate-100"}`}>
                {c.nome}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold text-slate-100 tabular-nums">{c.total}</div>
                <div className="text-[10px] text-slate-500">carteira</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-amber-400 tabular-nums">{c.urgente}</div>
                <div className="text-[10px] text-slate-500">≤180 dias</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-rose-400 tabular-nums">{c.vencidos}</div>
                <div className="text-[10px] text-slate-500">vencidos</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
