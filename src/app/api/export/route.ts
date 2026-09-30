import ExcelJS from "exceljs";
import { requireAction } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { handle } from "@/lib/api";
import { FIELD_LABELS } from "@/lib/fields";
import { applyFilters, filtersFromParams } from "@/lib/filters";
import { parseAmount } from "@/lib/format";
import { getStorage } from "@/lib/storage";
import { VOUCHER_FIELDS, type VoucherRecord } from "@/lib/types";

const COLUMNS: { key: keyof VoucherRecord; label: string; number?: boolean }[] = [
  { key: "id", label: "ID registro" },
  { key: "creado_en", label: "Fecha y hora de carga" },
  { key: "creado_por", label: "Usuario" },
  { key: "estado", label: "Estado" },
  ...VOUCHER_FIELDS.map((f) => ({ key: f, label: FIELD_LABELS[f], number: ["monto", "propina", "monto_total"].includes(f) })),
  { key: "foto_url", label: "Foto original" },
];

function csvCell(v: string) {
  // Evita inyección de fórmulas al abrir el CSV en Excel.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const GET = handle(async (req: Request) => {
  const session = await requireAction("view");
  const url = new URL(req.url);
  let all = await getStorage().vouchers.list();
  if (!can(session.rol, "delete")) all = all.filter((r) => r.estado !== "Eliminado");
  const records = applyFilters(all, filtersFromParams(url.searchParams));
  const origin = url.origin;
  const photoLink = (r: VoucherRecord) => (r.foto_url.startsWith("/") ? origin + r.foto_url : r.foto_url);
  const stamp = new Date().toISOString().slice(0, 10);

  if (url.searchParams.get("format") === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Vouchers");
    ws.columns = COLUMNS.map((c) => ({ header: c.label, key: c.key, width: Math.max(12, c.label.length + 2) }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const r of records) {
      ws.addRow(
        Object.fromEntries(
          COLUMNS.map((c) => [
            c.key,
            c.key === "foto_url" ? photoLink(r) : c.number ? (parseAmount(r[c.key] as string) ?? r[c.key]) : r[c.key],
          ]),
        ),
      );
    }
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="vouchers-${stamp}.xlsx"`,
      },
    });
  }

  // CSV con ";" y BOM, que Excel en español abre correctamente.
  const lines = [COLUMNS.map((c) => csvCell(c.label)).join(";")];
  for (const r of records) {
    lines.push(COLUMNS.map((c) => csvCell(c.key === "foto_url" ? photoLink(r) : String(r[c.key] ?? ""))).join(";"));
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vouchers-${stamp}.csv"`,
    },
  });
});
