import { parseAmount, recordAmount } from "./format";
import type { VoucherRecord } from "./types";

export interface RecordFilters {
  q?: string;
  desde?: string; // YYYY-MM-DD (fecha del voucher)
  hasta?: string;
  comercio?: string;
  usuario?: string;
  montoMin?: string;
  montoMax?: string;
  medioPago?: string;
  estado?: string; // "" = todos excepto Eliminado
}

export const FILTER_KEYS: (keyof RecordFilters)[] = [
  "q",
  "desde",
  "hasta",
  "comercio",
  "usuario",
  "montoMin",
  "montoMax",
  "medioPago",
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

/** Fecha efectiva de un registro: la del voucher o, si no se identificó, la de carga. */
export function recordDate(r: VoucherRecord): string {
  return r.fecha || (r.creado_en || "").slice(0, 10);
}

export function applyFilters(records: VoucherRecord[], f: RecordFilters): VoucherRecord[] {
  const q = fold(f.q || "").trim();
  const min = parseAmount(f.montoMin ?? "");
  const max = parseAmount(f.montoMax ?? "");
  return records
    .filter((r) => {
      if (f.estado ? r.estado !== f.estado : r.estado === "Eliminado") return false;
      const d = recordDate(r);
      if (f.desde && d < f.desde) return false;
      if (f.hasta && d > f.hasta) return false;
      if (f.comercio && !fold(r.comercio).includes(fold(f.comercio))) return false;
      if (f.usuario && r.creado_por !== f.usuario) return false;
      if (f.medioPago && !fold(`${r.medio_pago} ${r.tipo_tarjeta} ${r.debito_credito}`).includes(fold(f.medioPago)))
        return false;
      const amount = recordAmount(r);
      if (min !== null && amount < min) return false;
      if (max !== null && amount > max) return false;
      if (q && !fold(Object.values(r).join(" ")).includes(q)) return false;
      return true;
    })
    .sort((a, b) => (recordDate(b) + b.hora + b.creado_en).localeCompare(recordDate(a) + a.hora + a.creado_en));
}
