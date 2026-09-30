"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { FiltersBar, useFilters } from "@/components/Filters";
import { useSession } from "@/components/SessionProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { useRecords } from "@/components/useRecords";
import { applyFilters, filtersToParams, recordDate } from "@/lib/filters";
import { formatDate, formatMoney, recordAmount } from "@/lib/format";
import { can } from "@/lib/permissions";

export function History() {
  const user = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [filters, setFilters] = useFilters();
  const { records, error } = useRecords();
  const rows = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);
  const total = rows.reduce((s, r) => s + recordAmount(r), 0);
  const exportQuery = filtersToParams(filters).toString();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Historial</h1>
        <a className="btn-secondary py-2 text-sm" href={`/api/export?format=xlsx&${exportQuery}`}>Descargar Excel</a>
        <a className="btn-secondary py-2 text-sm" href={`/api/export?format=csv&${exportQuery}`}>Descargar CSV</a>
      </div>

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        records={records ?? []}
        showEliminados={can(user.rol, "delete")}
        autoFocusSearch={params.get("buscar") === "1"}
      />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!records && !error && <p className="py-10 text-center text-slate-500">Cargando…</p>}

      {records && (
        <>
          <p className="mb-2 text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? "registro" : "registros"} · {formatMoney(total)}
          </p>

          {/* Móvil: tarjetas */}
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <button onClick={() => router.push(`/historial/${r.id}`)} className="card w-full p-3 text-left active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.comercio || "Comercio no identificado"}</div>
                      <div className="text-xs text-slate-500">
                        {formatDate(recordDate(r))} {r.hora} · {r.creado_por}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(recordAmount(r), r.moneda)}</div>
                      <StatusBadge estado={r.estado} />
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[r.medio_pago, r.tipo_tarjeta, r.ultimos_4_digitos && `•••• ${r.ultimos_4_digitos}`, r.codigo_autorizacion && `Aut. ${r.codigo_autorizacion}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["Fecha", "Comercio", "RUT", "Monto", "Medio de pago", "Últimos 4", "Cód. autorización", "Usuario", "Estado"].map((h) => (
                    <th key={h} className={`px-3 py-2 font-medium ${h === "Monto" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => router.push(`/historial/${r.id}`)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-brand-50">
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(recordDate(r))}</td>
                    <td className="max-w-56 truncate px-3 py-2 font-medium">{r.comercio || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{r.rut_comercio || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMoney(recordAmount(r), r.moneda)}</td>
                    <td className="px-3 py-2">{[r.medio_pago, r.tipo_tarjeta].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{r.ultimos_4_digitos || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{r.codigo_autorizacion || "—"}</td>
                    <td className="px-3 py-2">{r.creado_por}</td>
                    <td className="px-3 py-2"><StatusBadge estado={r.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <p className="py-10 text-center text-slate-500">No hay registros con estos filtros.</p>}
        </>
      )}
    </div>
  );
}
