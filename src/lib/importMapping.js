import * as XLSX from "xlsx";

const CAMPOS = [
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
  { key: "consultor", label: "Consultor", obrigatorio: false, aliases: ["nome - rep 2", "consultor", "vendedor", "representante", "rep"] },
];

function normalizar(str) {
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

export function mapearColunas(headers) {
  const headersNorm = headers.map((h) => ({ original: h, norm: normalizar(h) }));
  return CAMPOS.map((campo) => {
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

function tituloCase(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/(^|\s)([a-z])/g, (_, sp, c) => sp + c.toUpperCase());
}

export function normalizarLinhas(linhasBrutas, mapeamento) {
  const porCampo = {};
  mapeamento.forEach((m) => {
    if (m.colunaDetectada) porCampo[m.key] = m.colunaDetectada;
  });

  const registros = [];
  const erros = [];

  linhasBrutas.forEach((linha, idx) => {
    const get = (key) => (porCampo[key] ? linha[porCampo[key]] : "");
    const codigo_cliente = String(get("codigo_cliente") || "").trim();
    const nome_cliente = String(get("nome_cliente") || "").trim();
    const numero_contrato = String(get("numero_contrato") || "").trim();
    const data_termino = parseData(get("data_termino"));

    if (!codigo_cliente || !nome_cliente || !numero_contrato || !data_termino) {
      erros.push({ linha: idx + 2, motivo: "faltam campos obrigatórios (código, nome, contrato ou vencimento)" });
      return;
    }

    const ufBruto = String(get("uf") || "").trim();
    const uf = UF_MAP[normalizar(ufBruto)] || (ufBruto.length === 2 ? ufBruto.toUpperCase() : ufBruto);

    registros.push({
      codigo_cliente,
      nome_cliente,
      bairro: String(get("bairro") || "").trim(),
      cidade: tituloCase(String(get("cidade") || "").trim()),
      uf,
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
