import React, { useState, useEffect } from "react";
import { Flame, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabaseClient";

export default function DossieIA({ clienteId, contratoId }) {
  const [dossie, setDossie] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!clienteId || !contratoId) return;
    supabase
      .from("cpv_planos_ia")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("contrato_id", contratoId)
      .order("gerado_em", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDossie(data || null));
  }, [clienteId, contratoId]);

  async function gerar() {
    setGerando(true);
    setErro(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/gerar-dossie`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ cliente_id: clienteId, contrato_id: contratoId }),
      });
      const json = await resp.json();
      if (!resp.ok || json.error) throw new Error(json.error || "Falha ao gerar o dossiê");
      setDossie(json.dossie);
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-3">
      <div className="flex items-center gap-2 text-amber-300 text-xs font-medium mb-1">
        <Flame size={13} /> Dossiê de Renovação (IA)
      </div>

      {!dossie && !gerando && (
        <button
          onClick={gerar}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-medium py-2 rounded-lg transition-colors mt-1"
        >
          <Sparkles size={13} /> Preparar visita com IA
        </button>
      )}

      {gerando && (
        <div className="flex items-center gap-2 text-xs text-amber-200 py-2">
          <Loader2 size={13} className="animate-spin" /> A IA está analisando...
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 mt-2">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {dossie && !gerando && (
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold text-slate-50">{dossie.score ?? "—"}<span className="text-xs text-slate-500">/100</span></span>
            <button onClick={gerar} className="text-[11px] text-amber-400 hover:text-amber-300">Gerar de novo</button>
          </div>
          {dossie.resumo_executivo && <p className="text-xs text-slate-300 leading-relaxed">{dossie.resumo_executivo}</p>}
          {dossie.analise_consumo && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-0.5">Consumo</div>
              <p className="text-xs text-slate-300 leading-relaxed">{dossie.analise_consumo}</p>
            </div>
          )}
          {dossie.objetivo_visita && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-0.5">Objetivo da visita</div>
              <p className="text-xs text-slate-300 leading-relaxed">{dossie.objetivo_visita}</p>
            </div>
          )}
          {Array.isArray(dossie.roteiro) && dossie.roteiro.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-0.5">Roteiro</div>
              <ol className="text-xs text-slate-300 leading-relaxed list-decimal list-inside flex flex-col gap-0.5">
                {dossie.roteiro.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            </div>
          )}
          {Array.isArray(dossie.perguntas) && dossie.perguntas.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-0.5">Perguntas sugeridas</div>
              <ul className="text-xs text-slate-300 leading-relaxed list-disc list-inside flex flex-col gap-0.5">
                {dossie.perguntas.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(dossie.objecoes_previstas) && dossie.objecoes_previstas.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-0.5">Objeções prováveis</div>
              <div className="flex flex-col gap-1.5">
                {dossie.objecoes_previstas.map((o, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                    <div className="text-xs text-slate-200 font-medium">{o.objecao}</div>
                    {o.como_investigar && <div className="text-[10px] text-slate-500 mt-0.5">Investigar: {o.como_investigar}</div>}
                    {o.como_responder && <div className="text-[10px] text-slate-500">Responder: {o.como_responder}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(dossie.argumentos_valor) && dossie.argumentos_valor.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-0.5">Argumentos de valor</div>
              <ul className="text-xs text-slate-300 leading-relaxed list-disc list-inside flex flex-col gap-0.5">
                {dossie.argumentos_valor.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          {dossie.decisor?.provavel && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase mb-0.5">Decisor</div>
              <p className="text-xs text-slate-300 leading-relaxed">{dossie.decisor.provavel}</p>
            </div>
          )}
          {dossie.proximo_passo && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
              <div className="text-[10px] text-amber-400 uppercase mb-0.5">Próximo passo</div>
              <p className="text-xs text-amber-100 leading-relaxed">{dossie.proximo_passo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
