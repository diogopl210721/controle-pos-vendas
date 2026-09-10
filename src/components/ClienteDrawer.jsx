import React, { useState, useEffect } from "react";
import { X, MapPin, Navigation, MessageCircle, Pencil, Save, Loader2, Plus, Trash2, Fuel } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../supabaseClient";
import ContratoItem from "./ContratoItem";
import DossieIA from "./DossieIA";
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
      <span className="text-sm text-slate-200 text-right">{value || "—"}</span>
    </div>
  );
}
function Campo({ label, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50"
      />
    </label>
  );
}
function soDigitos(str) { return String(str || "").replace(/\D/g, ""); }
function linkWhatsapp(numero) {
  let d = soDigitos(numero);
  if (!d) return null;
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}`;
}

const ABAS = [
  { key: "visao", label: "Visão Geral" },
  { key: "ia", label: "Plano de Ação IA" },
  { key: "historico", label: "Histórico" },
  { key: "consumo", label: "Consumo" },
];

export default function ClienteDrawer({ cliente, onClose, onAtualizado }) {
  const [aba, setAba] = useState("visao");
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(null);
  const [tanques, setTanques] = useState([]);
  const [carregandoTanques, setCarregandoTanques] = useState(false);
  const [novoTanque, setNovoTanque] = useState({ tipo: "", quantidade: 1, capacidade_unitaria_kg: "" });

  useEffect(() => {
    if (!cliente) return;
    setAba("visao");
    setEditando(false);
    setForm({
      documento: cliente.documento || "",
      endereco: cliente.endereco || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      uf: cliente.uf || "",
      telefone: cliente.telefone || "",
      whatsapp: cliente.whatsapp || "",
    });
    if (cliente.clienteId) {
      setCarregandoTanques(true);
      supabase.from("cpv_tanques").select("*").eq("cliente_id", cliente.clienteId)
        .then(({ data }) => { setTanques(data || []); setCarregandoTanques(false); });
    } else {
      setTanques([]);
    }
  }, [cliente]);

  if (!cliente || !form) return null;

  async function salvar() {
    if (!cliente.clienteId) return;
    setSalvando(true);
    const { error } = await supabase.from("cpv_clientes").update(form).eq("id", cliente.clienteId);
    setSalvando(false);
    if (!error) { setEditando(false); onAtualizado && onAtualizado(); }
  }
  async function adicionarTanque() {
    if (!cliente.clienteId || !novoTanque.tipo) return;
    const { data, error } = await supabase.from("cpv_tanques").insert({
      cliente_id: cliente.clienteId,
      tipo: novoTanque.tipo,
      quantidade: Number(novoTanque.quantidade) || 1,
      capacidade_unitaria_kg: novoTanque.capacidade_unitaria_kg ? Number(novoTanque.capacidade_unitaria_kg) : null,
    }).select().single();
    if (!error && data) { setTanques((t) => [...t, data]); setNovoTanque({ tipo: "", quantidade: 1, capacidade_unitaria_kg: "" }); }
  }
  async function removerTanque(id) {
    await supabase.from("cpv_tanques").delete().eq("id", id);
    setTanques((t) => t.filter((x) => x.id !== id));
  }

  const enderecoCompleto = form.endereco ? `${form.endereco}, ${form.bairro ? form.bairro + ", " : ""}${form.cidade} - ${form.uf}` : null;
  const enderecoAprox = `${cliente.nome} ${form.cidade}`;
  const linkMaps = `https://www.google.com/maps/search/${encodeURIComponent(enderecoCompleto || enderecoAprox)}`;
  const linkWaze = enderecoCompleto ? `https://waze.com/ul?q=${encodeURIComponent(enderecoCompleto)}&navigate=yes` : null;
  const wa = linkWhatsapp(form.whatsapp || form.telefone);

  const contratosOrdenados = [...(cliente.contratos || [])].sort((a, b) => a.dias - b.dias);
  const principal = cliente.maisUrgente || contratosOrdenados[0] || null;
  const consumo = cliente.consumo;
  const historicoConsumo = (consumo?.historico || []).map((h) => ({
    mes: h.mes_referencia.slice(0, 7),
    kg: Number(h.consumo_kg),
  }));

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 h-full overflow-y-auto flex flex-col">
        <div className="p-5 sm:p-6 pb-0">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-semibold text-slate-50 pr-6">{cliente.nome}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
          </div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-slate-500">Código {cliente.codigo}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{contratosOrdenados.length} contrato(s)</span>
            {principal && (
              <span className={`text-[11px] px-2 py-1 rounded-md border ${prioridade(principal.dias).cls}`}>{prioridade(principal.dias).label}</span>
            )}
          </div>

          <div className="flex items-center gap-1 border-b border-slate-800 -mx-1">
            {ABAS.map((a) => (
              <button
                key={a.key}
                onClick={() => setAba(a.key)}
                className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  aba === a.key ? "border-amber-500 text-amber-400" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 pt-4 flex-1">
          {aba === "visao" && (
            <div className="flex flex-col gap-4">
              {principal && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contrato principal</h3>
                  <Dado label="Número do contrato" value={principal.contrato} />
                  <Dado label="Início" value={formatDate(principal.inicio)} />
                  <Dado label="Vencimento" value={formatDate(principal.venc)} />
                  <Dado label="Consultor" value={principal.consultor} />
                </div>
              )}

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contato e endereço</h3>
                  {!editando ? (
                    <button onClick={() => setEditando(true)} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"><Pencil size={12} /> Editar</button>
                  ) : (
                    <button onClick={salvar} disabled={salvando} className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 disabled:opacity-50">
                      {salvando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                    </button>
                  )}
                </div>
                {!editando ? (
                  <>
                    <Dado label="Documento" value={form.documento} />
                    <Dado label="Endereço" value={form.endereco} />
                    <Dado label="Bairro" value={form.bairro} />
                    <Dado label="Cidade / UF" value={`${form.cidade} - ${form.uf}`} />
                    <Dado label="Telefone" value={form.telefone} />
                    <Dado label="WhatsApp" value={form.whatsapp} />
                  </>
                ) : (
                  <div className="flex flex-col gap-3 pt-1">
                    <Campo label="Documento (CNPJ/CPF)" value={form.documento} onChange={(v) => setForm({ ...form, documento: v })} />
                    <Campo label="Endereço" value={form.endereco} onChange={(v) => setForm({ ...form, endereco: v })} placeholder="Rua, número" />
                    <Campo label="Bairro" value={form.bairro} onChange={(v) => setForm({ ...form, bairro: v })} />
                    <div className="grid grid-cols-2 gap-3">
                      <Campo label="Cidade" value={form.cidade} onChange={(v) => setForm({ ...form, cidade: v })} />
                      <Campo label="UF" value={form.uf} onChange={(v) => setForm({ ...form, uf: v.toUpperCase().slice(0, 2) })} />
                    </div>
                    <Campo label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} placeholder="(41) 99999-9999" />
                    <Campo label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="(41) 99999-9999" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Fuel size={12} /> Tancagem
                  </h3>
                  <div className="text-xl font-semibold text-slate-100">{cliente.tancagemTotalKg ? `${cliente.tancagemTotalKg} kg` : "—"}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">capacidade total conhecida</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Consumo médio</h3>
                  <div className="text-xl font-semibold text-slate-100">{consumo?.mediaMensal ? `${Math.round(consumo.mediaMensal)} kg` : "—"}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">média mensal (12m)</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tancagem detalhada (manual)</h3>
                {carregandoTanques ? (
                  <div className="text-xs text-slate-500 flex items-center gap-2 py-2"><Loader2 size={12} className="animate-spin" /> Carregando...</div>
                ) : tanques.length === 0 ? (
                  <DadoIndisponivel label="Nenhum tanque cadastrado" />
                ) : (
                  tanques.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                      <span className="text-sm text-slate-200">{t.quantidade} x {t.tipo}{t.capacidade_unitaria_kg ? ` (${t.capacidade_unitaria_kg}kg cada)` : ""}</span>
                      <button onClick={() => removerTanque(t.id)} className="text-slate-600 hover:text-rose-400"><Trash2 size={13} /></button>
                    </div>
                  ))
                )}
                <div className="flex gap-2 mt-3">
                  <input value={novoTanque.tipo} onChange={(e) => setNovoTanque({ ...novoTanque, tipo: e.target.value })} placeholder="Tipo (ex: P190)" className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none" />
                  <input type="number" min="1" value={novoTanque.quantidade} onChange={(e) => setNovoTanque({ ...novoTanque, quantidade: e.target.value })} className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none" />
                  <input type="number" value={novoTanque.capacidade_unitaria_kg} onChange={(e) => setNovoTanque({ ...novoTanque, capacidade_unitaria_kg: e.target.value })} placeholder="kg" className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none" />
                  <button onClick={adicionarTanque} className="bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg px-2.5"><Plus size={14} /></button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ações rápidas</h3>
                <div className="grid grid-cols-3 gap-2">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-lg py-3 text-emerald-400">
                      <MessageCircle size={16} /><span className="text-[11px]">WhatsApp</span>
                    </a>
                  ) : (
                    <button disabled className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg py-3 text-slate-600 cursor-not-allowed">
                      <MessageCircle size={16} /><span className="text-[11px]">Sem telefone</span>
                    </button>
                  )}
                  <a href={linkMaps} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 hover:border-teal-500/40 rounded-lg py-3 text-teal-400">
                    <MapPin size={16} /><span className="text-[11px]">{enderecoCompleto ? "Maps" : "Maps (aprox.)"}</span>
                  </a>
                  {linkWaze ? (
                    <a href={linkWaze} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 hover:border-sky-500/40 rounded-lg py-3 text-sky-400">
                      <Navigation size={16} /><span className="text-[11px]">Waze</span>
                    </a>
                  ) : (
                    <button disabled className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg py-3 text-slate-600 cursor-not-allowed">
                      <Navigation size={16} /><span className="text-[11px]">Sem endereço</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {aba === "ia" && (
            principal ? (
              <DossieIA clienteId={cliente.clienteId} contratoId={principal.id} />
            ) : (
              <div className="text-xs text-slate-500 text-center py-10">Nenhum contrato ativo pra gerar dossiê.</div>
            )
          )}

          {aba === "historico" && (
            <div className="flex flex-col gap-2">
              {contratosOrdenados.map((c) => (
                <ContratoItem key={c.id} contrato={c} onAtualizado={onAtualizado} />
              ))}
            </div>
          )}

          {aba === "consumo" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Média mensal</div>
                  <div className="text-lg font-semibold text-slate-100">{consumo?.mediaMensal ? `${Math.round(consumo.mediaMensal)} kg` : "—"}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Últimos 12m</div>
                  <div className="text-lg font-semibold text-slate-100">{consumo?.volume12m ? `${Math.round(consumo.volume12m)} kg` : "—"}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Último mês</div>
                  <div className="text-lg font-semibold text-slate-100">{consumo?.ultimoMes ? `${Math.round(consumo.ultimoMes)} kg` : "—"}</div>
                </div>
              </div>

              {historicoConsumo.length > 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={historicoConsumo}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="mes" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} />
                      <Line type="monotone" dataKey="kg" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-lg">
                  Sem histórico de consumo ainda — importe a planilha de consumo mensal
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
