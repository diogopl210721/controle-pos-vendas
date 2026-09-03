import React from "react";
import ContratosTable from "../components/ContratosTable";

export default function CentralRenovacoes({ contratos, onSelect, filtroInicial }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Central de Renovações</h1>
        <p className="text-sm text-slate-500 mt-1">Todos os clientes que precisam de alguma ação, com filtros completos.</p>
      </div>
      <ContratosTable
        key={filtroInicial}
        contratos={contratos}
        onSelect={onSelect}
        porPagina={25}
        titulo="Clientes"
        mostrarFiltroConsultor
        filtroInicial={filtroInicial || "todos"}
      />
    </div>
  );
}
