const STYLES: Record<string, string> = {
  Registrado: "bg-blue-50 text-blue-700",
  Verificado: "bg-green-50 text-green-700",
  Observado: "bg-amber-50 text-amber-800",
  Eliminado: "bg-slate-100 text-slate-500 line-through",
};

export function StatusBadge({ estado }: { estado: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[estado] ?? "bg-slate-100"}`}>{estado}</span>;
}
