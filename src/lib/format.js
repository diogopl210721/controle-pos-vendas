export function prioridade(dias) {
  if (dias < 0) return { label: "Vencido", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
  if (dias <= 30) return { label: "30 dias", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
  if (dias <= 95) return { label: "95 dias", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  if (dias <= 150) return { label: "150 dias", cls: "bg-amber-400/10 text-amber-200 border-amber-400/20" };
  return { label: `${dias} dias`, cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" };
}

export function formatDate(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
