import { parseAmount, recordWeight } from "./format";
import type { VoucherRecord } from "./types";

export interface RecordFilters {
  q?: string;
  desde?: string; // YYYY-MM-DD (fecha del ticket)
  hasta?: string;
  patente?: string;
  origen?: string;
  usuario?: string;
  pesoMin?: string; // kilos netos
  pesoMax?: string;
  estado?: string; // "" = todos excepto Eliminado
}

export const FILTER_KEYS: (keyof RecordFilters)[] = [
  "q",
  "desde",
  "hasta",
  "patente",
  "origen",
  "usuario",
  "pesoMin",
  "pesoMax",
  "estado",
];

export function filtersFromParams(p: URLSearchParams): RecordFilters {
  const f: RecordFilters = {};
  for (const k of FILTER_KEYS) {
    const v = p.get(k);
    if (v) f[k] = v;
  }
  return f;
}

export function filtersToParams(f: RecordFilters): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) if (f[k]) p.set(k, f[k]!);
  return p;
}

const fold = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Fecha efectiva de un registro: la de entrada a báscula, la del ticket o, si no hay, la de carga. */
export function recordDate(r: VoucherRecord): string {
  return r.entrada_fecha || r.fecha || (r.creado_en || "").slice(0, 10);
}

export function applyFilters(records: VoucherRecord[], f: RecordFilters): VoucherRecord[] {
  const q = fold(f.q || "").trim();
  const min = parseAmount(f.pesoMin ?? "");
  const max = parseAmount(f.pesoMax ?? "");
  return records
    .filter((r) => {
      if (f.estado ? r.estado !== f.estado : r.estado === "Eliminado") return false;
      const d = recordDate(r);
      if (f.desde && d < f.desde) return false;
      if (f.hasta && d > f.hasta) return false;
      if (f.patente && !fold(r.patente).replace(/[\s-]/g, "").includes(fold(f.patente).replace(/[\s-]/g, ""))) return false;
      if (f.origen && !fold(r.origen).includes(fold(f.origen))) return false;
      if (f.usuario && r.creado_por !== f.usuario) return false;
      const kg = recordWeight(r);
      if (min !== null && kg < min) return false;
      if (max !== null && kg > max) return false;
      if (q && !fold(Object.values(r).join(" ")).includes(q)) return false;
      return true;
    })
    .sort((a, b) => (recordDate(b) + (b.entrada_hora || b.hora) + b.creado_en).localeCompare(recordDate(a) + (a.entrada_hora || a.hora) + a.creado_en));
}
