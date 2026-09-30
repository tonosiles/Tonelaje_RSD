/** Convierte "12.500", "12,500.00", "$ 12.500" o "12500" en número. Devuelve null si no es posible. */
export function parseAmount(value: string | number | undefined | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = value.replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // El último separador es el decimal
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // "12,50" decimal; "12,500" miles
    s = /,\d{3}$/.test(s) && s.split(",").length >= 2 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    // "12.500" miles (formato chileno); "12.50" decimal
    if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(value: string | number | null | undefined, currency = "CLP"): string {
  const n = typeof value === "number" ? value : parseAmount(value ?? "");
  if (n === null) return "";
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : "CLP",
      maximumFractionDigits: currency === "CLP" || !currency ? 0 : 2,
    }).format(n);
  } catch {
    return n.toLocaleString("es-CL");
  }
}

/** Fecha local (zona horaria de la app) en formato YYYY-MM-DD. */
export function localDate(d: Date = new Date(), timeZone = process.env.NEXT_PUBLIC_TIMEZONE || "America/Santiago"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function formatDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CL", {
    timeZone: process.env.NEXT_PUBLIC_TIMEZONE || "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ymd || "";
}

/** Monto principal de un registro: el total pagado si existe; si no, el monto. */
export function recordAmount(r: { monto_total: string; monto: string }): number {
  return parseAmount(r.monto_total) ?? parseAmount(r.monto) ?? 0;
}
