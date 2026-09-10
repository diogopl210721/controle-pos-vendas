import * as XLSX from "xlsx";

// ---------- utilidades gerais ----------

export function normalizar(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function scoreMatch(headerNorm, aliasNorm) {
  if (!headerNorm || !aliasNorm) return 0;
  if (headerNorm === aliasNorm) return 100;
  if (headerNorm.includes(aliasNorm) || aliasNorm.includes(headerNorm)) return 85;
  const hWords = new Set(headerNorm.split(" ").filter(Boolean));
  const aWords = aliasNorm.split(" ").filter(Boolean);
  const overlap = aWords.filter((w) => hWords.has(w)).length;
  if (aWords.length === 0) return 0;
  return Math.round((overlap / aWords.length) * 70);
}

export function lerPlanilha(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const linhas = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const headers = linhas.length > 0 ? Object.keys(linhas[0]) : [];
        resolve({ headers, linhas });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function mapearColunas(headers, campos) {
  const headersNorm = headers.map((h) => ({ original: h, norm: normalizar(h) }));
  return campos.map((campo) => {
    let melhor = { header: null, score: 0 };
    for (const h of headersNorm) {
      for (const alias of campo.aliases) {
        const s = scoreMatch(h.norm, normalizar(alias));
        if (s > melhor.score) melhor = { header: h.original, score: s };
      }
    }
    return { ...campo, colunaDetectada: melhor.score >= 40 ? melhor.header : null, confianca: melhor.score };
  });
}

function parseData(valor) {
  if (!valor && valor !== 0) return null;
  if (valor instanceof Date && !isNaN(valor)) {
    return valor.toISOString().slice(0, 10);
  }
  const str = String(valor).trim();
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return null;
}

const UF_MAP = {
  parana: "PR", "santa catarina": "SC", "sao paulo": "SP", "rio grande do sul": "RS",
  "rio de janeiro": "RJ", "minas gerais": "MG",
};

function normalizarUf(bruto) {
  const ufBruto = String(bruto || "").trim();
  return UF_MAP[normalizar(ufBruto)] || (ufBruto.length === 2 ? ufBruto.toUpperCase() : ufBruto);
}

function tituloCase(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/(^|\s)([a-z])/g, (_, sp, c) => sp + c.toUpperCase());
}

function limparCodigo(v) {
  return String(v || "").trim().replace(/^0+(?=\d)/, "");
}

// ---------- tipo: CONTRATOS ----------

export const CAMPOS_CONTRATOS = [
  { key: "codigo_cliente", label: "Código do cliente", obrigatorio: true, aliases: ["codigo cliente", "código cliente", "cod cliente", "codigo do cliente"] },
  { key: "nome_cliente", label: "Nome do cliente", obrigatorio: true, aliases: ["nome do cliente", "cliente", "razao social", "razão social", "nome"] },
  { key: "numero_contrato", label: "Número do contrato", obrigatorio: true, aliases: ["numero do contrato", "número do contrato", "contrato", "numero contrato"] },
  { key: "data_inicio", label: "Data de início", obrigatorio: false, aliases: ["data de inicio do contrato", "data de início do contrato", "data inicio", "inicio do contrato"] },
  { key: "data_termino", label: "Data de vencimento", obrigatorio: true, aliases: ["data de termino do contrato", "data de término do contrato", "data termino", "data vencimento", "vencimento", "data fim"] },
  { key: "prazo_meses", label: "Prazo (meses)", obrigatorio: false, aliases: ["prazo do contrato (meses)", "prazo meses", "prazo"] },
  { key: "status", label: "Status", obrigatorio: false, aliases: ["status", "situacao", "situação"] },
  { key: "canal_venda", label: "Canal de venda", obrigatorio: false, aliases: ["canal de venda", "canal", "segmento"] },
  { key: "bairro", label: "Bairro", obrigatorio: false, aliases: ["bairro"] },
  { key: "cidade", label: "Cidade", obrigatorio: false, aliases: ["cidade", "municipio", "município"] },
  { key: "uf", label: "UF", obrigatorio: false, aliases: ["uf", "estado"] },
  { key: "consultor", label: "Consultor", obrigatorio: false, aliases: ["nome - rep 2", "consultor", "vendedor"] },
];

export function normalizarLinhasContratos(linhasBrutas, mapeamento) {
  const porCampo = {};
  mapeamento.forEach((m) => { if (m.colunaDetectada) porCampo[m.key] = m.colunaDetectada; });

  const registros = [];
  const erros = [];

  linhasBrutas.forEach((linha, idx) => {
    const get = (key) => (porCampo[key] ? linha[porCampo[key]] : "");
    const codigo_cliente = limparCodigo(get("codigo_cliente"));
    const nome_cliente = String(get("nome_cliente") || "").trim();
    const numero_contrato = limparCodigo(get("numero_contrato"));
    const data_termino = parseData(get("data_termino"));

    if (!codigo_cliente || !nome_cliente || !numero_contrato || !data_termino) {
      erros.push({ linha: idx + 2, motivo: "faltam campos obrigatórios (código, nome, contrato ou vencimento)" });
      return;
    }

    registros.push({
      codigo_cliente,
      nome_cliente,
      bairro: String(get("bairro") || "").trim(),
      cidade: tituloCase(String(get("cidade") || "").trim()),
      uf: normalizarUf(get("uf")),
      numero_contrato,
      data_inicio: parseData(get("data_inicio")) || data_termino,
      data_termino,
      prazo_meses: parseInt(get("prazo_meses"), 10) || null,
      status: String(get("status") || "Vigente").trim() || "Vigente",
      canal_venda: String(get("canal_venda") || "").trim(),
      consultor_nome: String(get("consultor") || "").trim(),
    });
  });

  return { registros, erros };
}

// ---------- tipo: TANCAGEM E ENDEREÇO (relatório de rota/entrega) ----------

export const CAMPOS_TANCAGEM = [
  { key: "codigo_cliente", label: "Código do cliente", obrigatorio: true, aliases: ["cliente", "codigo cliente", "cod cliente"] },
  { key: "nome_cliente", label: "Nome do cliente", obrigatorio: false, aliases: ["nome cliente", "razao social", "nome do cliente"] },
  { key: "endereco", label: "Endereço", obrigatorio: false, aliases: ["endereco"] },
  { key: "bairro", label: "Bairro", obrigatorio: false, aliases: ["bairro"] },
  { key: "cidade", label: "Cidade", obrigatorio: false, aliases: ["cidade"] },
  { key: "uf", label: "UF", obrigatorio: false, aliases: ["estado", "uf"] },
  { key: "tancagem", label: "Tancagem (capacidade total kg)", obrigatorio: true, aliases: ["tancagem"] },
  { key: "consultor", label: "Consultor", obrigatorio: false, aliases: ["representante 2"] },
];

export function normalizarLinhasTancagem(linhasBrutas, mapeamento) {
  const porCampo = {};
  mapeamento.forEach((m) => { if (m.colunaDetectada) porCampo[m.key] = m.colunaDetectada; });

  const porCliente = {};
  const erros = [];

  linhasBrutas.forEach((linha, idx) => {
    const get = (key) => (porCampo[key] ? linha[porCampo[key]] : "");
    const codigo_cliente = limparCodigo(get("codigo_cliente"));
    const tancagem = Number(get("tancagem"));

    if (!codigo_cliente || !tancagem || isNaN(tancagem)) {
      erros.push({ linha: idx + 2, motivo: "faltam código do cliente ou tancagem" });
      return;
    }

    // fica com a última ocorrência de cada cliente na planilha
    porCliente[codigo_cliente] = {
      codigo_cliente,
      nome_cliente: String(get("nome_cliente") || "").trim(),
      endereco: String(get("endereco") || "").trim(),
      bairro: String(get("bairro") || "").trim(),
      cidade: tituloCase(String(get("cidade") || "").trim()),
      uf: normalizarUf(get("uf")),
      tancagem_total_kg: tancagem,
      consultor_nome: String(get("consultor") || "").trim(),
    };
  });

  return { registros: Object.values(porCliente), erros };
}

// ---------- tipo: CONSUMO MENSAL (relatório de vendas) ----------

export const CAMPOS_CONSUMO = [
  { key: "codigo_cliente", label: "Código do cliente", obrigatorio: true, aliases: ["cod cli", "codigo cliente", "cod cliente"] },
  { key: "nome_cliente", label: "Nome do cliente", obrigatorio: false, aliases: ["razao social", "nome"] },
  { key: "quantidade_kg", label: "Quantidade (kg)", obrigatorio: true, aliases: ["qtde kg", "quantidade kg", "kg"] },
  { key: "mes", label: "Mês", obrigatorio: true, aliases: ["mes"] },
];

const MESES_PT = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function parseMes(valor) {
  // formato esperado: "01.Janeiro", "2.Fevereiro" etc — extrai o número do mês
  const str = String(valor || "").trim();
  const m = str.match(/^(\d{1,2})/);
  if (m) return parseInt(m[1], 10);
  const norm = normalizar(str);
  const idx = MESES_PT.indexOf(norm);
  return idx >= 0 ? idx + 1 : null;
}

export function normalizarLinhasConsumo(linhasBrutas, mapeamento) {
  const porCampo = {};
  mapeamento.forEach((m) => { if (m.colunaDetectada) porCampo[m.key] = m.colunaDetectada; });
  const get = (linha, key) => (porCampo[key] ? linha[porCampo[key]] : "");

  // 1) descobre o mês mais recente presente na planilha ("mês vigente")
  let mesMaisRecente = 0;
  linhasBrutas.forEach((linha) => {
    const mes = parseMes(get(linha, "mes"));
    if (mes && mes > mesMaisRecente) mesMaisRecente = mes;
  });

  if (!mesMaisRecente) {
    return { registros: [], erros: [{ linha: 0, motivo: "não consegui identificar nenhum mês na planilha" }], mesUsado: null };
  }

  // 2) filtra só esse mês e soma por cliente (uma planilha pode ter várias linhas de item por cliente/mês)
  const ano = new Date().getFullYear();
  const mesReferencia = `${ano}-${String(mesMaisRecente).padStart(2, "0")}-01`;
  const somaPorCliente = {};
  const erros = [];

  linhasBrutas.forEach((linha, idx) => {
    const mes = parseMes(get(linha, "mes"));
    if (mes !== mesMaisRecente) return;
    const codigo_cliente = limparCodigo(get(linha, "codigo_cliente"));
    const qtd = Number(get(linha, "quantidade_kg"));
    if (!codigo_cliente || isNaN(qtd)) {
      erros.push({ linha: idx + 2, motivo: "faltam código do cliente ou quantidade" });
      return;
    }
    somaPorCliente[codigo_cliente] = (somaPorCliente[codigo_cliente] || 0) + qtd;
  });

  const registros = Object.entries(somaPorCliente).map(([codigo_cliente, consumo_kg]) => ({
    codigo_cliente,
    consumo_kg: Math.round(consumo_kg * 100) / 100,
    mes_referencia: mesReferencia,
  }));

  return { registros, erros, mesUsado: mesMaisRecente, anoUsado: ano };
}

// ---------- detecção automática do tipo de planilha ----------

export function detectarTipoPlanilha(headers) {
  const normHeaders = headers.map(normalizar);
  const tem = (termo) => normHeaders.some((h) => h.includes(normalizar(termo)));

  if (tem("data de termino do contrato") || tem("numero do contrato") || tem("número do contrato")) {
    return "contratos";
  }
  if (tem("tancagem") && (tem("data atendimento") || tem("representante"))) {
    return "tancagem";
  }
  if (tem("qtde (kg)") || (tem("kg") && tem("mes"))) {
    return "consumo";
  }
  return "desconhecido";
}

export const TIPOS_PLANILHA = {
  contratos: { label: "Contratos", campos: CAMPOS_CONTRATOS, normalizar: normalizarLinhasContratos },
  tancagem: { label: "Tancagem e endereço", campos: CAMPOS_TANCAGEM, normalizar: normalizarLinhasTancagem },
  consumo: { label: "Consumo mensal", campos: CAMPOS_CONSUMO, normalizar: normalizarLinhasConsumo },
};
