import { parseAmount } from "./format";
import type { VoucherData, VoucherRecord } from "./types";

export interface DuplicateMatch {
  record: VoucherRecord;
  score: number;
  coincidencias: string[];
}

const norm = (s: string) => (s || "").replace(/[\s.-]+/g, "").replace(/^0+(?=\d)/, "").toUpperCase();

/**
 * Busca registros que probablemente correspondan al mismo ticket.
 * Un folio idéntico pesa más que la patente, la fecha o el peso.
 */
export function findDuplicates(data: VoucherData, records: VoucherRecord[]): DuplicateMatch[] {
  const neto = parseAmount(data.peso_neto);
  const fecha = data.entrada_fecha || data.fecha;
  const matches: DuplicateMatch[] = [];
  for (const r of records) {
    if (r.estado === "Eliminado") continue;
    const c: string[] = [];
    let score = 0;
    if (data.folio && norm(data.folio) === norm(r.folio)) {
      score += 3;
      c.push("folio");
    }
    if (data.patente && norm(data.patente) === norm(r.patente)) {
      score += 1;
      c.push("patente");
    }
    if (fecha && fecha === (r.entrada_fecha || r.fecha)) {
      score += 1;
      c.push("fecha");
    }
    const rNeto = parseAmount(r.peso_neto);
    if (neto !== null && rNeto !== null && neto === rNeto) {
      score += 1;
      c.push("peso neto");
    }
    if (data.entrada_hora && data.entrada_hora === r.entrada_hora) {
      score += 1;
      c.push("hora de entrada");
    }
    // Probable duplicado: mismo folio + otro dato, o misma patente, fecha y peso neto.
    if (score >= 4 || (c.includes("patente") && c.includes("fecha") && c.includes("peso neto"))) {
      matches.push({ record: r, score, coincidencias: c });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}
