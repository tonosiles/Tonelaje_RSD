import { localDate, recordAmount } from "./format";
import { recordDate } from "./filters";
import type { VoucherRecord } from "./types";

export interface Stats {
  total: number;
  montoTotal: number;
  hoy: number;
  mes: number;
  porUsuario: { nombre: string; cantidad: number }[];
  porComercio: { nombre: string; cantidad: number; monto: number }[];
  porFecha: { fecha: string; monto: number; cantidad: number }[];
}

export function computeStats(records: VoucherRecord[], now = new Date()): Stats {
  const today = localDate(now);
  const month = today.slice(0, 7);
  const users = new Map<string, number>();
  const shops = new Map<string, { cantidad: number; monto: number }>();
  const days = new Map<string, { cantidad: number; monto: number }>();
  let montoTotal = 0;
  let hoy = 0;
  let mes = 0;

  for (const r of records) {
    const amount = recordAmount(r);
    montoTotal += amount;
    // "Registrados hoy / este mes" se mide por la fecha de carga.
    const loaded = r.creado_en ? localDate(new Date(r.creado_en)) : "";
    if (loaded === today) hoy++;
    if (loaded.startsWith(month)) mes++;
    users.set(r.creado_por || "—", (users.get(r.creado_por || "—") ?? 0) + 1);
    const shopKey = r.comercio.trim() || "No identificado";
    const s = shops.get(shopKey) ?? { cantidad: 0, monto: 0 };
    s.cantidad++;
    s.monto += amount;
    shops.set(shopKey, s);
    const d = recordDate(r);
    if (d) {
      const x = days.get(d) ?? { cantidad: 0, monto: 0 };
      x.cantidad++;
      x.monto += amount;
      days.set(d, x);
    }
  }

  return {
    total: records.length,
    montoTotal,
    hoy,
    mes,
    porUsuario: [...users].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
    porComercio: [...shops]
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.monto - a.monto),
    porFecha: [...days].map(([fecha, v]) => ({ fecha, ...v })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  };
}
