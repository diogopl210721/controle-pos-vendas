import React from "react";
import { Database, ShieldAlert } from "lucide-react";

export default function Configuracoes({ consultores }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">Informações técnicas do sistema.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
          <Database size={16} className="text-teal-400" /> Banco de dados
        </div>
        <p className="text-xs text-slate-500">
          Supabase (projeto compartilhado <code className="text-slate-400">arffptuclrrzuzdrcmuc</code>), tabelas com
          prefixo <code className="text-slate-400">cpv_</code>.
        </p>
      </div>

      <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-amber-300 text-sm font-medium">
          <ShieldAlert size={16} /> Acesso temporário sem login
        </div>
        <p className="text-xs text-amber-200/80 leading-relaxed">
          Enquanto não existe autenticação, qualquer pessoa com o link consegue ler e importar dados. Isso é
          intencional só para o período de teste — quando o login por consultor for implementado, cada um passa a
          ver apenas a própria carteira.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Consultores cadastrados</h3>
        <div className="flex flex-col gap-1">
          {consultores.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 last:border-0 py-2">
              <span className="text-slate-300">{c.nome}</span>
              <span className="capitalize">{c.perfil}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
