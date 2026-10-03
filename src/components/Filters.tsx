"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FILTER_KEYS, filtersFromParams, filtersToParams, type RecordFilters } from "@/lib/filters";
import { ESTADOS, type VoucherRecord } from "@/lib/types";

/** Filtros sincronizados con la URL, para que se puedan compartir y exportar. */
export function useFilters(): [RecordFilters, (f: RecordFilters) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(params.toString())), [params]);
  const set = (f: RecordFilters) => {
    const p = filtersToParams(f);
    router.replace(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };
  return [filters, set];
}

export function FiltersBar({
  filters,
  onChange,
  records,
  showEliminados,
  autoFocusSearch,
}: {
  filters: RecordFilters;
  onChange: (f: RecordFilters) => void;
  records: VoucherRecord[];
  showEliminados: boolean;
  autoFocusSearch?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(filters.q ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const users = useMemo(() => [...new Set(records.map((r) => r.creado_por).filter(Boolean))].sort(), [records]);
  const active = FILTER_KEYS.filter((k) => k !== "q" && filters[k]).length;

  useEffect(() => {
    if (autoFocusSearch) searchRef.current?.focus();
  }, [autoFocusSearch]);

  // Búsqueda con pequeña espera para no recalcular en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q ?? "") !== q) onChange({ ...filters, q: q || undefined });
    }, 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof RecordFilters, v: string) => onChange({ ...filters, [k]: v || undefined });

  return (
    <div className="card mb-4 p-3">
      <div className="flex gap-2">
        <input
          ref={searchRef}
          className="input"
          type="search"
          placeholder="Buscar folio, patente, chofer, origen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-secondary shrink-0 px-3 py-2 text-sm" onClick={() => setOpen(!open)}>
          Filtros{active ? ` (${active})` : ""}
        </button>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={filters.desde ?? ""} onChange={(e) => set("desde", e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={filters.hasta ?? ""} onChange={(e) => set("hasta", e.target.value)} />
          </div>
          <div>
            <label className="label">Patente</label>
            <input className="input" value={filters.patente ?? ""} onChange={(e) => set("patente", e.target.value)} />
          </div>
          <div>
            <label className="label">Usuario</label>
            <select className="input" value={filters.usuario ?? ""} onChange={(e) => set("usuario", e.target.value)}>
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Peso neto mínimo (kg)</label>
            <input className="input" inputMode="numeric" value={filters.pesoMin ?? ""} onChange={(e) => set("pesoMin", e.target.value)} />
          </div>
          <div>
            <label className="label">Peso neto máximo (kg)</label>
            <input className="input" inputMode="numeric" value={filters.pesoMax ?? ""} onChange={(e) => set("pesoMax", e.target.value)} />
          </div>
          <div>
            <label className="label">Origen</label>
            <input className="input" placeholder="Ej. Cholchol" value={filters.origen ?? ""} onChange={(e) => set("origen", e.target.value)} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={filters.estado ?? ""} onChange={(e) => set("estado", e.target.value)}>
              <option value="">Todos (vigentes)</option>
              {ESTADOS.filter((e) => showEliminados || e !== "Eliminado").map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          {active > 0 && (
            <button className="col-span-2 text-left text-sm text-brand-700 underline md:col-span-4" onClick={() => { setQ(""); onChange({}); }}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
