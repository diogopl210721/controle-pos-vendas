import React, { useState, useEffect } from "react";
import { X, MapPin, Navigation, MessageCircle, Flame, Pencil, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { prioridade, formatDate } from "../lib/format";
import { supabase } from "../supabaseClient";

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

function soDigitos(str) {
  return String(str || "").replace(/\D/g, "");
}

function linkWhatsapp(numero) {
  let d = soDigitos(numero);
  if (!d) return null;
  if (d.length <= 11) d = "55" + d; // assume BR, adiciona DDI se não tiver
  return `https://wa.me/${d}`;
}

export default function ClienteDrawer({ cliente, onClose, onAtualizado }) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(null);
  const [tanques, setTanques] = useState([]);
  const [carregandoTanques, setCarregandoTanques] = useState(false);
  const [novoTanque, setNovoTanque] = useState({ tipo: "", quantidade: 1, capacidade_unitaria_kg: "" });

  useEffect(() => {
    if (!cliente) return;
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
      supabase
        .from("cpv_tanques")
        .select("*")
        .eq("cliente_id", cliente.clienteId)
        .then(({ data }) => {
          setTanques(data || []);
          setCarregandoTanques(false);
        });
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
    if (!error) {
      setEditando(false);
      onAtualizado && onAtualizado();
    }
  }

  async function adicionarTanque() {
    if (!cliente.clienteId || !novoTanque.tipo) return;
    const { data, error } = await supabase
      .from("cpv_tanques")
      .insert({
        cliente_id: cliente.clienteId,
        tipo: novoTanque.tipo,
        quantidade: Number(novoTanque.quantidade) || 1,
        capacidade_unitaria_kg: novoTanque.capacidade_unitaria_kg ? Number(novoTanque.capacidade_unitaria_kg) : null,
      })
      .select()
      .single();
    if (!error && data) {
      setTanques((t) => [...t, data]);
      setNovoTanque({ tipo: "", quantidade: 1, capacidade_unitaria_kg: "" });
    }
  }

  async function removerTanque(id) {
    await supabase.from("cpv_tanques").delete().eq("id", id);
    setTanques((t) => t.filter((x) => x.id !== id));
  }

  const enderecoCompleto = form.endereco
    ? `${form.endereco}, ${form.bairro ? form.bairro + ", " : ""}${form.cidade} - ${form.uf}`
    : null;
  const enderecoAprox = `${cliente.nome} ${form.cidade}`;
  const linkMaps = `https://www.google.com/maps/search/${encodeURIComponent(enderecoCompleto || enderecoAprox)}`;
  const linkWaze = enderecoCompleto
    ? `https://waze.com/ul?q=${encodeURIComponent(enderecoCompleto)}&navigate=yes`
    : null;
  const wa = linkWhatsapp(form.whatsapp || form.telefone);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-5 sm:p-6">
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
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contato e endereço</h3>
            {!editando ? (
              <button onClick={() => setEditando(true)} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                <Pencil size={12} /> Editar
              </button>
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

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tancagem</h3>
          {carregandoTanques ? (
            <div className="text-xs text-slate-500 flex items-center gap-2 py-2"><Loader2 size={12} className="animate-spin" /> Carregando...</div>
          ) : tanques.length === 0 ? (
            <DadoIndisponivel label="Nenhum tanque cadastrado" />
          ) : (
            tanques.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                <span className="text-sm text-slate-200">{t.quantidade} x {t.tipo}{t.capacidade_unitaria_kg ? ` (${t.capacidade_unitaria_kg}kg cada)` : ""}</span>
                <button onClick={() => removerTanque(t.id)} className="text-slate-600 hover:text-rose-400">
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
          <div className="flex gap-2 mt-3">
            <input
              value={novoTanque.tipo}
              onChange={(e) => setNovoTanque({ ...novoTanque, tipo: e.target.value })}
              placeholder="Tipo (ex: P190)"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
            />
            <input
              type="number"
              min="1"
              value={novoTanque.quantidade}
              onChange={(e) => setNovoTanque({ ...novoTanque, quantidade: e.target.value })}
              className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
            />
            <input
              type="number"
              value={novoTanque.capacidade_unitaria_kg}
              onChange={(e) => setNovoTanque({ ...novoTanque, capacidade_unitaria_kg: e.target.value })}
              placeholder="kg"
              className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
            />
            <button onClick={adicionarTanque} className="bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg px-2.5">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Consumo</h3>
          <DadoIndisponivel label="Consumo médio mensal" />
          <DadoIndisponivel label="Histórico 12 meses" />
        </div>

        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ações rápidas</h3>
          <div className="grid grid-cols-3 gap-2">
            {wa ? (
              <a href={wa} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-lg py-3 text-emerald-400">
                <MessageCircle size={16} />
                <span className="text-[11px]">WhatsApp</span>
              </a>
            ) : (
              <button disabled className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg py-3 text-slate-600 cursor-not-allowed">
                <MessageCircle size={16} />
                <span className="text-[11px]">Sem telefone</span>
              </button>
            )}
            <a href={linkMaps} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 hover:border-teal-500/40 rounded-lg py-3 text-teal-400">
              <MapPin size={16} />
              <span className="text-[11px]">{enderecoCompleto ? "Maps" : "Maps (aprox.)"}</span>
            </a>
            {linkWaze ? (
              <a href={linkWaze} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 hover:border-sky-500/40 rounded-lg py-3 text-sky-400">
                <Navigation size={16} />
                <span className="text-[11px]">Waze</span>
              </a>
            ) : (
              <button disabled className="flex flex-col items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg py-3 text-slate-600 cursor-not-allowed">
                <Navigation size={16} />
                <span className="text-[11px]">Sem endereço</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-1">
            <Flame size={15} /> Dossiê de Renovação (IA)
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Ainda não está ligado à IA de verdade — falta montar a função no servidor que chama o Claude com os
            dados de tancagem e consumo. Preencher a tancagem acima já ajuda, mas o botão continua desativado até essa
            parte ser construída.
          </p>
          <button disabled className="w-full bg-slate-800 text-slate-500 text-xs font-medium py-2.5 rounded-lg cursor-not-allowed">
            Preparar visita com IA — ainda não conectado
          </button>
        </div>
      </div>
    </div>
  );
}
