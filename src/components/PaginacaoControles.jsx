import React from "react";

export default function PaginacaoControles({ pagina, totalPaginas, onAnterior, onProxima }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">
      <span>Página {pagina} de {totalPaginas}</span>
      <div className="flex gap-2">
        <button
          disabled={pagina <= 1}
          onClick={onAnterior}
          className="px-3 py-1 rounded-md border border-slate-800 disabled:opacity-30"
        >
          Anterior
        </button>
        <button
          disabled={pagina >= totalPaginas}
          onClick={onProxima}
          className="px-3 py-1 rounded-md border border-slate-800 disabled:opacity-30"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
