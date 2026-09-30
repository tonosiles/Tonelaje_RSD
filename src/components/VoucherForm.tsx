"use client";
import { FIELD_DEFS } from "@/lib/fields";
import type { VoucherData, VoucherField } from "@/lib/types";

/** Formulario editable con todos los campos del voucher. */
export function VoucherForm({
  value,
  onChange,
  dudosos = [],
}: {
  value: VoucherData;
  onChange: (next: VoucherData) => void;
  dudosos?: VoucherField[];
}) {
  const set = (k: VoucherField, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {FIELD_DEFS.map((f) => {
        const doubtful = dudosos.includes(f.key);
        const empty = !value[f.key];
        const cls = `input ${doubtful ? "border-amber-400 bg-amber-50" : ""}`;
        return (
          <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label className="label flex items-center gap-2" htmlFor={`f-${f.key}`}>
              {f.label}
              {doubtful && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">Verificar</span>}
              {empty && !doubtful && <span className="text-xs font-normal text-slate-400">No identificado</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                id={`f-${f.key}`}
                className={cls}
                rows={3}
                value={value[f.key]}
                placeholder="No identificado"
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : (
              <input
                id={`f-${f.key}`}
                className={cls}
                type={f.type === "date" ? "date" : "text"}
                inputMode={f.inputMode}
                value={value[f.key]}
                placeholder={f.type === "time" ? "HH:MM" : "No identificado"}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
