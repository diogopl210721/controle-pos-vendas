import React, { useState, useEffect } from "react";
import { Upload, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";
import { supabase } from "../supabaseClient";
import { lerPlanilha, mapearColunas, detectarTipoPlanilha, TIPOS_PLANILHA } from "../lib/importMapping";
import { formatDate } from "../lib/format";

const NOMES_INVALIDOS_CONSULTOR = ["", "pendente consultor", "cliente inativo", "n/a", "-"];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizarNome(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function nomesBatem(a, b) {
  const na = normalizarNome(a);
  const nb = normalizarNome(b);
  if (!na || !nb) return true;
  return na === nb || na.includes(nb) || nb.includes(na);
}

const MESES_NOME = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Importacoes({ onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [etapa, setEtapa] = useState("upload");
  const [linhasBrutas, setLinhasBrutas] = useState([]);
  const [tipo, setTipo] = useState("contratos");
  const [tipoDetectado, setTipoDetectado] = useState(null);
  const [mapeamento, setMapeamento] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [erros, setErros] = useState([]);
  const [mesInfo, setMesInfo] = useState(null);
  const [progresso, setProgresso] = useState("");
  const [resultado, setResultado] = useState(null);
  const [erroGeral, setErroGeral] = useState(null);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    supabase.from("cpv_importacoes").select("*").order("criado_em", { ascending: false }).limit(10)
      .then(({ data }) => setHistorico(data || []));
  }, [resultado]);

  async function handleFile(file) {
    setArquivo(file);
    setEtapa("mapeando");
    setErroGeral(null);
    try {
      const { headers, linhas } = await lerPlanilha(file);
      const tipoDetec = detectarTipoPlanilha(headers);
      const tipoInicial = tipoDetec === "desconhecido" ? "contratos" : tipoDetec;
      setLinhasBrutas(linhas);
      setTipoDetectado(tipoDetec);
      aplicarTipo(tipoInicial, headers, linhas);
      setEtapa("preview");
    } catch (err) {
      setErroGeral("Não consegui ler esse arquivo: " + err.message);
      setEtapa("upload");
    }
  }

  function aplicarTipo(novoTipo, headers, linhas) {
    setTipo(novoTipo);
    const cfg = TIPOS_PLANILHA[novoTipo];
    const map = mapearColunas(headers, cfg.campos);
    const resultado = cfg.normalizar(linhas, map);
    setMapeamento(map);
    setRegistros(resultado.registros);
    setErros(resultado.erros);
    setMesInfo(resultado.mesUsado ? { mes: resultado.mesUsado, ano: resultado.anoUsado } : null);
  }

  function trocarTipo(novoTipo) {
    // re-lê os headers a partir da primeira linha bruta pra remapear do zero
    const headers = linhasBrutas.length > 0 ? Object.keys(linhasBrutas[0]) : [];
    aplicarTipo(novoTipo, headers, linhasBrutas);
  }

  async function mapaConsultores(nomes) {
    const nomesValidos = Array.from(new Set(nomes.map((n) => n.trim()).filter((n) => !NOMES_INVALIDOS_CONSULTOR.includes(n.toLowerCase()))));
    const { data: existentes } = await supabase.from("cpv_consultores").select("id, nome");
    const mapa = {};
    (existentes || []).forEach((c) => (mapa[c.nome] = c.id));
    const novos = nomesValidos.filter((n) => !mapa[n]);
    if (novos.length > 0) {
      const { data: inseridos, error } = await supabase.from("cpv_consultores").insert(novos.map((nome) => ({ nome, perfil: "consultor" }))).select("id, nome");
      if (error) throw error;
      (inseridos || []).forEach((c) => (mapa[c.nome] = c.id));
    }
    return { mapa, novos: novos.length };
  }

  async function confirmarContratos() {
    setProgresso("Verificando consultores...");
    const { mapa: mapaConsultor, novos: novosConsultores } = await mapaConsultores(registros.map((r) => r.consultor_nome));

    setProgresso("Comparando com o que já existe no banco...");
    const clientesPorCodigo = {};
    registros.forEach((r) => {
      const atual = clientesPorCodigo[r.codigo_cliente];
      if (!atual || r.data_termino > atual.data_termino) clientesPorCodigo[r.codigo_cliente] = r;
    });
    const codigosDoImport = Object.keys(clientesPorCodigo);

    const existentesPorCodigo = {};
    for (const lote of chunk(codigosDoImport, 300)) {
      const { data, error } = await supabase.from("cpv_clientes").select("codigo_cliente, nome, bairro, cidade, uf").in("codigo_cliente", lote);
      if (error) throw error;
      (data || []).forEach((c) => (existentesPorCodigo[c.codigo_cliente] = c));
    }

    let clientesNovos = 0, clientesAtualizados = 0;
    const divergencias = [];
    setProgresso("Enviando clientes...");
    const clientesRows = Object.values(clientesPorCodigo).map((r) => {
      const existente = existentesPorCodigo[r.codigo_cliente];
      if (!existente) {
        clientesNovos++;
        return { codigo_cliente: r.codigo_cliente, nome: r.nome_cliente, bairro: r.bairro || null, cidade: r.cidade || null, uf: r.uf || null, consultor_id: mapaConsultor[r.consultor_nome] || null };
      }
      const confirmado = nomesBatem(existente.nome, r.nome_cliente);
      if (!confirmado) divergencias.push({ codigo: r.codigo_cliente, nomeAntigo: existente.nome, nomeNovo: r.nome_cliente });
      else clientesAtualizados++;
      const row = {
        codigo_cliente: r.codigo_cliente,
        nome: confirmado ? (r.nome_cliente || existente.nome) : existente.nome,
        bairro: confirmado ? (r.bairro || existente.bairro || null) : existente.bairro,
        cidade: confirmado ? (r.cidade || existente.cidade || null) : existente.cidade,
        uf: confirmado ? (r.uf || existente.uf || null) : existente.uf,
      };
      if (confirmado) row.consultor_id = mapaConsultor[r.consultor_nome] || null;
      return row;
    });
    for (const lote of chunk(clientesRows, 300)) {
      const { error } = await supabase.from("cpv_clientes").upsert(lote, { onConflict: "codigo_cliente" });
      if (error) throw error;
    }

    setProgresso("Vinculando contratos aos clientes...");
    const mapaCliente = {};
    for (const lote of chunk(codigosDoImport, 300)) {
      const { data, error } = await supabase.from("cpv_clientes").select("id, codigo_cliente").in("codigo_cliente", lote);
      if (error) throw error;
      (data || []).forEach((c) => (mapaCliente[c.codigo_cliente] = c.id));
    }

    setProgresso("Enviando contratos...");
    const contratosRows = registros.filter((r) => mapaCliente[r.codigo_cliente]).map((r) => ({
      cliente_id: mapaCliente[r.codigo_cliente],
      numero_contrato: r.numero_contrato,
      data_inicio: r.data_inicio,
      data_termino: r.data_termino,
      prazo_meses: r.prazo_meses,
      status: r.status,
      canal_venda: r.canal_venda || null,
      consultor_id: mapaConsultor[r.consultor_nome] || null,
    }));
    for (const lote of chunk(contratosRows, 300)) {
      const { error } = await supabase.from("cpv_contratos").upsert(lote, { onConflict: "numero_contrato" });
      if (error) throw error;
    }

    setProgresso("Verificando reativações pendentes...");
    let pendenciasReativacao = 0;
    const numerosDoImport = contratosRows.map((r) => r.numero_contrato);
    for (const lote of chunk(numerosDoImport, 300)) {
      const { data: fechados, error: erroFechados } = await supabase.from("cpv_contratos").select("id").in("numero_contrato", lote).not("situacao_gestao", "is", null);
      if (erroFechados) throw erroFechados;
      if (fechados && fechados.length > 0) {
        pendenciasReativacao += fechados.length;
        const { error: erroFlag } = await supabase.from("cpv_contratos").update({ pendente_confirmacao_reativacao: true }).in("id", fechados.map((f) => f.id));
        if (erroFlag) throw erroFlag;
      }
    }

    return {
      resumo: `${clientesNovos} clientes novos e ${clientesAtualizados} já existentes (código + nome confirmados) · ${contratosRows.length} contratos no total`,
      linhasImportadas: contratosRows.length,
      novosConsultores, divergencias, pendenciasReativacao,
    };
  }

  async function confirmarTancagem() {
    setProgresso("Verificando consultores...");
    const { mapa: mapaConsultor, novos: novosConsultores } = await mapaConsultores(registros.map((r) => r.consultor_nome));

    setProgresso("Comparando com clientes já cadastrados...");
    const codigos = registros.map((r) => r.codigo_cliente);
    const existentesPorCodigo = {};
    for (const lote of chunk(codigos, 300)) {
      const { data, error } = await supabase.from("cpv_clientes").select("id, codigo_cliente, nome, bairro, cidade, uf, endereco, consultor_id").in("codigo_cliente", lote);
      if (error) throw error;
      (data || []).forEach((c) => (existentesPorCodigo[c.codigo_cliente] = c));
    }

    let atualizados = 0, ignorados = 0;
    setProgresso("Atualizando tancagem e endereço...");
    const rows = [];
    registros.forEach((r) => {
      const existente = existentesPorCodigo[r.codigo_cliente];
      if (!existente) { ignorados++; return; }
      atualizados++;
      rows.push({
        id: existente.id,
        codigo_cliente: r.codigo_cliente,
        nome: existente.nome,
        endereco: existente.endereco || r.endereco || null,
        bairro: existente.bairro || r.bairro || null,
        cidade: existente.cidade || r.cidade || null,
        uf: existente.uf || r.uf || null,
        consultor_id: existente.consultor_id || mapaConsultor[r.consultor_nome] || null,
        tancagem_total_kg: r.tancagem_total_kg,
        tancagem_atualizada_em: new Date().toISOString(),
      });
    });
    for (const lote of chunk(rows, 300)) {
      const { error } = await supabase.from("cpv_clientes").upsert(lote, { onConflict: "codigo_cliente" });
      if (error) throw error;
    }

    return {
      resumo: `${atualizados} cliente(s) com tancagem atualizada${ignorados > 0 ? ` · ${ignorados} código(s) não encontrados na base (ignorados — essa planilha não cria cliente novo)` : ""}`,
      linhasImportadas: atualizados,
      novosConsultores,
    };
  }

  async function confirmarConsumo() {
    setProgresso("Vinculando aos clientes já cadastrados...");
    const codigos = registros.map((r) => r.codigo_cliente);
    const mapaCliente = {};
    for (const lote of chunk(codigos, 300)) {
      const { data, error } = await supabase.from("cpv_clientes").select("id, codigo_cliente").in("codigo_cliente", lote);
      if (error) throw error;
      (data || []).forEach((c) => (mapaCliente[c.codigo_cliente] = c.id));
    }

    let gravados = 0, ignorados = 0;
    setProgresso("Gravando consumo mensal...");
    const rows = [];
    registros.forEach((r) => {
      const clienteId = mapaCliente[r.codigo_cliente];
      if (!clienteId) { ignorados++; return; }
      gravados++;
      rows.push({ cliente_id: clienteId, mes_referencia: r.mes_referencia, consumo_kg: r.consumo_kg, origem: "importacao" });
    });
    for (const lote of chunk(rows, 300)) {
      const { error } = await supabase.from("cpv_consumo_mensal").upsert(lote, { onConflict: "cliente_id,mes_referencia" });
      if (error) throw error;
    }

    const nomeMes = mesInfo ? `${MESES_NOME[mesInfo.mes]}/${mesInfo.ano}` : "?";
    return {
      resumo: `Consumo de ${nomeMes}: ${gravados} cliente(s) atualizados${ignorados > 0 ? ` · ${ignorados} código(s) não encontrados na base (ignorados)` : ""}`,
      linhasImportadas: gravados,
    };
  }

  async function confirmarImportacao() {
    setEtapa("importando");
    setErroGeral(null);
    try {
      let res;
      if (tipo === "contratos") res = await confirmarContratos();
      else if (tipo === "tancagem") res = await confirmarTancagem();
      else res = await confirmarConsumo();

      const mapeamentoLog = { _tipo: tipo };
      mapeamento.forEach((m) => { if (m.colunaDetectada) mapeamentoLog[m.label] = { coluna: m.colunaDetectada, confianca: m.confianca }; });
      await supabase.from("cpv_importacoes").insert({
        arquivo_nome: arquivo?.name || "planilha.xlsx",
        mapeamento_colunas: mapeamentoLog,
        total_linhas: linhasBrutas.length,
        linhas_importadas: res.linhasImportadas,
        linhas_com_erro: erros.length,
        status: "concluida",
      });

      setResultado(res);
      setEtapa("feito");
      if (onImportado) onImportado();
    } catch (err) {
      setErroGeral(err.message);
      setEtapa("erro");
    }
  }

  function reiniciar() {
    setArquivo(null);
    setEtapa("upload");
    setLinhasBrutas([]);
    setMapeamento([]);
    setRegistros([]);
    setErros([]);
    setMesInfo(null);
    setResultado(null);
    setErroGeral(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Importação Inteligente</h1>
        <p className="text-sm text-slate-500 mt-1">
          Suba qualquer planilha (contratos, tancagem/rota, ou consumo mensal) — o sistema identifica o tipo sozinho.
        </p>
      </div>

      {etapa === "upload" && (
        <label className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer bg-slate-900 transition-colors">
          <Upload className="text-amber-400" size={28} />
          <span className="text-sm text-slate-300 font-medium">Clique para escolher a planilha</span>
          <span className="text-xs text-slate-500">.xlsx, .xls ou .csv</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
        </label>
      )}

      {erroGeral && etapa === "upload" && (
        <div className="flex items-center gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={15} /> {erroGeral}
        </div>
      )}

      {etapa === "mapeando" && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin text-amber-400" size={16} /> Lendo planilha e identificando colunas...
        </div>
      )}

      {etapa === "preview" && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 text-slate-200 text-sm font-medium mb-4">
              <FileSpreadsheet size={16} className="text-amber-400" /> {arquivo?.name}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-slate-500">Tipo detectado:</span>
              <select
                value={tipo}
                onChange={(e) => trocarTipo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none"
              >
                {Object.entries(TIPOS_PLANILHA).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              {tipoDetectado === tipo && <CheckCircle2 size={13} className="text-teal-400" />}
            </div>

            {tipo === "consumo" && mesInfo && (
              <div className="text-xs text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2 mb-4">
                Pegando só o mês mais recente da planilha: <strong>{MESES_NOME[mesInfo.mes]}/{mesInfo.ano}</strong>
              </div>
            )}

            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Mapeamento de colunas</h3>
            <div className="flex flex-col gap-2 mb-2">
              {mapeamento.map((m) => (
                <div key={m.key} className="flex items-center justify-between gap-3 text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                  <span className="text-slate-300">{m.label}{m.obrigatorio && <span className="text-rose-400"> *</span>}</span>
                  {m.colunaDetectada ? (
                    <span className="flex items-center gap-2 text-slate-400">
                      <span className="text-slate-500">{m.colunaDetectada}</span>
                      <CheckCircle2 size={13} className="text-teal-400" />
                      <span className="tabular-nums">{m.confianca}%</span>
                    </span>
                  ) : (
                    <span className="text-slate-600 italic">não encontrada</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {registros.length} linhas prontas para importar
              {erros.length > 0 && <span className="text-amber-400"> · {erros.length} linhas serão ignoradas (faltam campos obrigatórios)</span>}
            </p>
          </div>

          {registros.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-800">
                    <th className="py-2 px-3 font-medium">Código</th>
                    {tipo === "contratos" && <>
                      <th className="py-2 px-3 font-medium">Cliente</th>
                      <th className="py-2 px-3 font-medium">Contrato</th>
                      <th className="py-2 px-3 font-medium">Vencimento</th>
                      <th className="py-2 px-3 font-medium">Consultor</th>
                    </>}
                    {tipo === "tancagem" && <>
                      <th className="py-2 px-3 font-medium">Cliente</th>
                      <th className="py-2 px-3 font-medium">Cidade</th>
                      <th className="py-2 px-3 font-medium">Tancagem</th>
                    </>}
                    {tipo === "consumo" && <>
                      <th className="py-2 px-3 font-medium">Consumo no mês (kg)</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {registros.slice(0, 6).map((r, i) => (
                    <tr key={i} className="border-b border-slate-800/50 text-slate-400">
                      <td className="py-2 px-3">{r.codigo_cliente}</td>
                      {tipo === "contratos" && <>
                        <td className="py-2 px-3 text-slate-200 max-w-[180px] truncate">{r.nome_cliente}</td>
                        <td className="py-2 px-3">{r.numero_contrato}</td>
                        <td className="py-2 px-3">{formatDate(r.data_termino)}</td>
                        <td className="py-2 px-3">{r.consultor_nome || "—"}</td>
                      </>}
                      {tipo === "tancagem" && <>
                        <td className="py-2 px-3 text-slate-200 max-w-[180px] truncate">{r.nome_cliente}</td>
                        <td className="py-2 px-3">{r.cidade}</td>
                        <td className="py-2 px-3">{r.tancagem_total_kg} kg</td>
                      </>}
                      {tipo === "consumo" && <td className="py-2 px-3">{r.consumo_kg} kg</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {registros.length > 6 && (
                <div className="text-center text-xs text-slate-500 py-2">+ {registros.length - 6} linhas</div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={confirmarImportacao}
              disabled={registros.length === 0}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Confirmar e importar {registros.length} {tipo === "contratos" ? "contratos" : "clientes"}
            </button>
            <button onClick={reiniciar} className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2.5">Cancelar</button>
          </div>
        </>
      )}

      {etapa === "importando" && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="animate-spin text-amber-400" size={16} /> {progresso}
        </div>
      )}

      {etapa === "feito" && resultado && (
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-teal-300 font-medium text-sm">
            <CheckCircle2 size={16} /> Importação concluída
          </div>
          <p className="text-sm text-slate-300">
            {resultado.resumo}
            {resultado.novosConsultores > 0 && <> · {resultado.novosConsultores} consultores novos cadastrados</>}
            {erros.length > 0 && <> · {erros.length} linhas ignoradas por falta de dado obrigatório</>}.
          </p>
          {resultado.divergencias?.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-300 font-medium mb-2">
                {resultado.divergencias.length} código(s) com nome diferente do cadastrado — não atualizei esses, revise manualmente:
              </p>
              <div className="flex flex-col gap-1">
                {resultado.divergencias.slice(0, 8).map((d, i) => (
                  <div key={i} className="text-xs text-amber-200/80">
                    Código {d.codigo}: <span className="text-slate-400">"{d.nomeAntigo}"</span> na base vs{" "}
                    <span className="text-slate-400">"{d.nomeNovo}"</span> na planilha
                  </div>
                ))}
              </div>
            </div>
          )}
          {resultado.pendenciasReativacao > 0 && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
              <p className="text-xs text-sky-300">
                <strong className="font-semibold">{resultado.pendenciasReativacao} contrato(s)</strong> que estavam marcados como
                encerrado/perdido/transferido voltaram a aparecer nessa planilha. Vá em Clientes → filtro "Pendências" pra confirmar.
              </p>
            </div>
          )}
          <button onClick={reiniciar} className="self-start text-sm text-amber-400 hover:text-amber-300">Importar outra planilha</button>
        </div>
      )}

      {etapa === "erro" && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-rose-300 font-medium text-sm">
            <AlertTriangle size={16} /> Deu erro na importação
          </div>
          <p className="text-sm text-slate-300">{erroGeral}</p>
          <button onClick={reiniciar} className="self-start text-sm text-amber-400 hover:text-amber-300">Tentar de novo</button>
        </div>
      )}

      {historico.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Histórico de importações</h3>
          <div className="flex flex-col gap-2">
            {historico.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 last:border-0 py-2">
                <span className="text-slate-300 truncate max-w-[160px]">{h.arquivo_nome}</span>
                <span className="text-slate-500">{h.mapeamento_colunas?._tipo ? TIPOS_PLANILHA[h.mapeamento_colunas._tipo]?.label : ""}</span>
                <span>{h.linhas_importadas} linha(s)</span>
                <span>{new Date(h.criado_em).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
