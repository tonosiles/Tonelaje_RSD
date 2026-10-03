import { localDate, recordWeight } from "./format";
import { recordDate } from "./filters";
import type { VoucherRecord } from "./types";

export interface Group {
  nombre: string;
  cantidad: number;
  kilos: number;
}

export interface Stats {
  total: number;
  kilosTotal: number;
  hoy: number;
  mes: number;
  kilosMes: number;
  porUsuario: { nombre: string; cantidad: number }[];
  porOrigen: Group[];
  porPatente: Group[];
  porFecha: { fecha: string; kilos: number; cantidad: number }[];
}

function group(records: VoucherRecord[], key: (r: VoucherRecord) => string): Group[] {
  const map = new Map<string, Group>();
  for (const r of records) {
    const nombre = key(r).trim() || "No identificado";
    const g = map.get(nombre) ?? { nombre, cantidad: 0, kilos: 0 };
    g.cantidad++;
    g.kilos += recordWeight(r);
    map.set(nombre, g);
  }
  return [...map.values()].sort((a, b) => b.kilos - a.kilos);
}

export function computeStats(records: VoucherRecord[], now = new Date()): Stats {
  const today = localDate(now);
  const month = today.slice(0, 7);
  const users = new Map<string, number>();
  const days = new Map<string, { cantidad: number; kilos: number }>();
  let kilosTotal = 0;
  let kilosMes = 0;
  let hoy = 0;
  let mes = 0;

  for (const r of records) {
    const kg = recordWeight(r);
    kilosTotal += kg;
    // "Registrados hoy / este mes" se mide por la fecha de carga.
    const loaded = r.creado_en ? localDate(new Date(r.creado_en)) : "";
    if (loaded === today) hoy++;
    if (loaded.startsWith(month)) mes++;
    const d = recordDate(r);
    if (d.startsWith(month)) kilosMes += kg;
    users.set(r.creado_por || "—", (users.get(r.creado_por || "—") ?? 0) + 1);
    if (d) {
      const x = days.get(d) ?? { cantidad: 0, kilos: 0 };
      x.cantidad++;
      x.kilos += kg;
      days.set(d, x);
    }
  }

  return {
    total: records.length,
    kilosTotal,
    hoy,
    mes,
    kilosMes,
    porUsuario: [...users].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
    porOrigen: group(records, (r) => r.origen),
    porPatente: group(records, (r) => r.patente),
    porFecha: [...days].map(([fecha, v]) => ({ fecha, ...v })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  };
}
