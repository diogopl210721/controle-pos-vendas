import React from "react";
import ClientesTable from "../components/ClientesTable";

export default function Clientes({ contratos, onSelect, filtroInicial }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Clientes</h1>
        <p className="text-sm text-slate-500 mt-1">Todos os clientes, com os contratos e o status de renovação de cada um.</p>
      </div>
      <ClientesTable
        key={filtroInicial}
        contratos={contratos}
        onSelect={onSelect}
        porPagina={30}
        titulo="Clientes"
        mostrarFiltroConsultor
        filtroInicial={filtroInicial || "todos"}
      />
    </div>
  );
}
