import React, { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Save, AlertTriangle, Check, X as XIcon } from "lucide-react";
import { prioridade, formatDate } from "../lib/format";
import { supabase } from "../supabaseClient";
import DossieIA from "./DossieIA";

const OPCOES_STATUS = [
  { value: "", label: "Ativo (em acompanhamento normal)" },
  { value: "encerrado", label: "Encerrado" },
  { value: "perdido", label: "Perdido" },
  { value: "transferido", label: "Transferido para outro código" },
];

function badgeSituacao(contrato) {
  if (contrato.situacaoGestao === "encerrado") return { label: "Encerrado", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
  if (contrato.situacaoGestao === "perdido") return { label: "Perdido", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
  if (contrato.situacaoGestao === "transferido") return { label: "Transferido", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
  return prioridade(contrato.dias);
}

export default function ContratoItem({ contrato, onAtualizado }) {
  const [aberto, setAberto] = useState(false);
  const [editandoStatus, setEditandoStatus] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [respondendoPendencia, setRespondendoPendencia] = useState(false);
  const [form, setForm] = useState({
    situacao_gestao: contrato.situacaoGestao || "",
    motivo_situacao: contrato.motivoSituacao || "",
    transferido_para_codigo: contrato.transferidoParaCodigo || "",
  });

  const badge = badgeSituacao(contrato);

  async function salvarStatus() {
    setSalvando(true);
    const payload = {
      situacao_gestao: form.situacao_gestao || null,
      motivo_situacao: form.motivo_situacao || null,
      transferido_para_codigo: form.situacao_gestao === "transferido" ? form.transferido_para_codigo || null : null,
      situacao_atualizada_em: new Date().toISOString(),
      pendente_confirmacao_reativacao: false,
    };
    const { error } = await supabase.from("cpv_contratos").update(payload).eq("id", contrato.id);
    setSalvando(false);
    if (!error) {
      setEditandoStatus(false);
      onAtualizado && onAtualizado();
    }
  }

  async function responderPendencia(reativar) {
    setRespondendoPendencia(true);
    const payload = reativar
      ? { situacao_gestao: null, motivo_situacao: null, transferido_para_codigo: null, pendente_confirmacao_reativacao: false }
      : { pendente_confirmacao_reativacao: false };
    const { error } = await supabase.from("cpv_contratos").update(payload).eq("id", contrato.id);
    setRespondendoPendencia(false);
    if (!error) onAtualizado && onAtualizado();
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
      <button onClick={() => setAberto(!aberto)} className="w-full flex items-center justify-between gap-2 p-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          {aberto ? <ChevronDown size={14} className="text-slate-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm text-slate-200 truncate">Contrato {contrato.contrato}</div>
            <div className="text-[11px] text-slate-500">{formatDate(contrato.inicio)} → {formatDate(contrato.venc)}</div>
          </div>
        </div>
        <span className={`text-[11px] px-2 py-1 rounded-md border shrink-0 ${badge.cls}`}>{badge.label}</span>
      </button>

      {contrato.pendenteReativacao && (
        <div className="mx-3 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
          <div className="flex items-start gap-2 text-xs text-amber-200">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>Esse contrato voltou a aparecer na última planilha, mas está marcado como <strong>{contrato.situacaoGestao}</strong>. Reativar?</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              disabled={respondendoPendencia}
              onClick={() => responderPendencia(true)}
              className="flex items-center gap-1 text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg px-2.5 py-1"
            >
              <Check size={12} /> Sim, reativar
            </button>
            <button
              disabled={respondendoPendencia}
              onClick={() => responderPendencia(false)}
              className="flex items-center gap-1 text-xs bg-slate-800 text-slate-400 border border-slate-700 rounded-lg px-2.5 py-1"
            >
              <XIcon size={12} /> Não, manter {contrato.situacaoGestao}
            </button>
          </div>
        </div>
      )}

      {aberto && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          <div className="text-xs text-slate-400 flex flex-col gap-1">
            <div className="flex justify-between"><span className="text-slate-500">Canal</span><span>{contrato.canal || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Prazo</span><span>{contrato.prazo} meses</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Consultor</span><span>{contrato.consultor}</span></div>
            {contrato.motivoSituacao && (
              <div className="flex justify-between gap-3"><span className="text-slate-500 shrink-0">Motivo</span><span className="text-right">{contrato.motivoSituacao}</span></div>
            )}
            {contrato.situacaoGestao === "transferido" && contrato.transferidoParaCodigo && (
              <div className="flex justify-between"><span className="text-slate-500">Novo código</span><span>{contrato.transferidoParaCodigo}</span></div>
            )}
          </div>

          {!editandoStatus ? (
            <button onClick={() => setEditandoStatus(true)} className="text-xs text-amber-400 hover:text-amber-300 text-left">
              Alterar status deste contrato
            </button>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
              <select
                value={form.situacao_gestao}
                onChange={(e) => setForm({ ...form, situacao_gestao: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
              >
                {OPCOES_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {form.situacao_gestao === "transferido" && (
                <input
                  value={form.transferido_para_codigo}
                  onChange={(e) => setForm({ ...form, transferido_para_codigo: e.target.value })}
                  placeholder="Código do cliente novo"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
                />
              )}
              {form.situacao_gestao && (
                <textarea
                  value={form.motivo_situacao}
                  onChange={(e) => setForm({ ...form, motivo_situacao: e.target.value })}
                  placeholder="Motivo (obrigatório pra você lembrar depois)"
                  rows={2}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none resize-none"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={salvarStatus}
                  disabled={salvando}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {salvando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                </button>
                <button onClick={() => setEditandoStatus(false)} className="text-xs text-slate-500 px-2">Cancelar</button>
              </div>
            </div>
          )}

          <DossieIA clienteId={contrato.clienteId} contratoId={contrato.id} />
        </div>
      )}
    </div>
  );
}
