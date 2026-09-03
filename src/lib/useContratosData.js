import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export function diasParaVencer(dataTermino) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataTermino + "T00:00:00");
  return Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
}

export function useContratosData() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [contratos, setContratos] = useState([]);
  const [consultores, setConsultores] = useState([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);

    const { data: consData, error: consErro } = await supabase
      .from("cpv_consultores")
      .select("id, nome, perfil")
      .order("nome", { ascending: true });
    if (consErro) {
      setErro(consErro.message);
      setLoading(false);
      return;
    }
    setConsultores(consData || []);

    const { data, error } = await supabase
      .from("cpv_contratos")
      .select(`
        id, numero_contrato, data_inicio, data_termino, prazo_meses, canal_venda,
        cliente:cpv_clientes ( id, codigo_cliente, nome, bairro, cidade, uf, documento, endereco, telefone, whatsapp ),
        consultor:cpv_consultores ( id, nome )
      `)
      .order("data_termino", { ascending: true })
      .limit(5000);

    if (error) {
      setErro(error.message);
      setLoading(false);
      return;
    }

    const linhas = (data || []).map((c) => ({
      id: c.id,
      clienteId: c.cliente?.id ?? null,
      codigo: c.cliente?.codigo_cliente ?? "-",
      nome: c.cliente?.nome ?? "Cliente sem nome",
      bairro: c.cliente?.bairro ?? "",
      cidade: c.cliente?.cidade ?? "",
      uf: c.cliente?.uf ?? "",
      documento: c.cliente?.documento ?? "",
      endereco: c.cliente?.endereco ?? "",
      telefone: c.cliente?.telefone ?? "",
      whatsapp: c.cliente?.whatsapp ?? "",
      contrato: c.numero_contrato,
      inicio: c.data_inicio,
      venc: c.data_termino,
      prazo: c.prazo_meses,
      canal: c.canal_venda,
      consultorId: c.consultor?.id ?? null,
      consultor: c.consultor?.nome ?? "Pendente consultor",
      dias: diasParaVencer(c.data_termino),
    }));

    setContratos(linhas);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { loading, erro, contratos, consultores, refetch: carregar };
}
