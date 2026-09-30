import { parseAmount } from "./format";
import type { VoucherData, VoucherRecord } from "./types";

export interface DuplicateMatch {
  record: VoucherRecord;
  score: number;
  coincidencias: string[];
}

const norm = (s: string) => (s || "").replace(/\s+/g, "").replace(/^0+(?=\d)/, "").toUpperCase();

/**
 * Busca registros que probablemente correspondan al mismo voucher.
 * Un código de autorización o número de operación idéntico pesa más que la fecha o el monto.
 */
export function findDuplicates(data: VoucherData, records: VoucherRecord[]): DuplicateMatch[] {
  const amount = parseAmount(data.monto_total) ?? parseAmount(data.monto);
  const matches: DuplicateMatch[] = [];
  for (const r of records) {
    if (r.estado === "Eliminado") continue;
    const c: string[] = [];
    let score = 0;
    if (data.codigo_autorizacion && norm(data.codigo_autorizacion) === norm(r.codigo_autorizacion)) {
      score += 3;
      c.push("código de autorización");
    }
    if (data.numero_operacion && norm(data.numero_operacion) === norm(r.numero_operacion)) {
      score += 3;
      c.push("número de operación");
    }
    if (data.fecha && data.fecha === r.fecha) {
      score += 1;
      c.push("fecha");
    }
    const rAmount = parseAmount(r.monto_total) ?? parseAmount(r.monto);
    if (amount !== null && rAmount !== null && Math.abs(amount - rAmount) < 0.005) {
      score += 1;
      c.push("monto");
    }
    if (data.ultimos_4_digitos && data.ultimos_4_digitos === r.ultimos_4_digitos) {
      score += 1;
      c.push("últimos 4 dígitos");
    }
    // Probable duplicado: coincide un identificador fuerte + otro dato, o fecha + monto + tarjeta.
    if (score >= 4 || (score >= 3 && c.includes("fecha") && c.includes("monto"))) {
      matches.push({ record: r, score, coincidencias: c });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}
