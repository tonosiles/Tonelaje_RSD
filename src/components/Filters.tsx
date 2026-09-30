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
          placeholder="Buscar comercio, RUT, código, monto…"
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
            <label className="label">Comercio</label>
            <input className="input" value={filters.comercio ?? ""} onChange={(e) => set("comercio", e.target.value)} />
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
            <label className="label">Monto mínimo</label>
            <input className="input" inputMode="decimal" value={filters.montoMin ?? ""} onChange={(e) => set("montoMin", e.target.value)} />
          </div>
          <div>
            <label className="label">Monto máximo</label>
            <input className="input" inputMode="decimal" value={filters.montoMax ?? ""} onChange={(e) => set("montoMax", e.target.value)} />
          </div>
          <div>
            <label className="label">Medio de pago</label>
            <input className="input" placeholder="Ej. Visa, débito" value={filters.medioPago ?? ""} onChange={(e) => set("medioPago", e.target.value)} />
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
