"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { VoucherForm } from "@/components/VoucherForm";
import { FIELD_SECTIONS } from "@/lib/fields";
import { formatDate, formatDateTime, formatKg, recordTitle } from "@/lib/format";
import { can } from "@/lib/permissions";
import { ESTADOS, VOUCHER_FIELDS, type Estado, type VoucherData, type VoucherRecord } from "@/lib/types";

export function Detail({ id }: { id: string }) {
  const user = useSession();
  const router = useRouter();
  const [record, setRecord] = useState<VoucherRecord | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<VoucherData | null>(null);
  const [estado, setEstado] = useState<Estado>("Registrado");
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const canEdit = can(user.rol, "edit");

  useEffect(() => {
    fetch(`/api/vouchers/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No se pudo cargar el registro.");
        setRecord(json.record);
        setEstado(json.record.estado);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  function startEdit() {
    if (!record) return;
    setDraft(Object.fromEntries(VOUCHER_FIELDS.map((f) => [f, record[f]])) as VoucherData);
    setEstado(record.estado);
    setEditing(true);
  }

  async function saveEdit() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/vouchers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, estado }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error || "No se pudo guardar.");
    setRecord(json.record);
    setEditing(false);
  }

  async function remove() {
    if (!confirm("¿Eliminar este registro? Quedará marcado como Eliminado y oculto del historial.")) return;
    setBusy(true);
    const res = await fetch(`/api/vouchers/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error || "No se pudo eliminar.");
    router.push("/historial");
  }

  if (error && !record) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!record) return <p className="py-10 text-center text-slate-500">Cargando…</p>;

  const photoSrc = `/api/photos/${record.id}`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href="/historial" className="text-sm text-brand-700">← Historial</Link>
      </div>
      <div className="mb-4 flex flex-wrap items-start gap-2">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold">{recordTitle(record)}</h1>
          <p className="text-slate-600">
            {[formatKg(record.peso_neto) && `${formatKg(record.peso_neto)} netos`, record.origen, `${formatDate(record.entrada_fecha || record.fecha)} ${record.entrada_hora || record.hora}`.trim()].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusBadge estado={record.estado} />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="card overflow-hidden">
          <button className="block w-full bg-slate-100" onClick={() => setZoom(true)} title="Ampliar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc} alt="Fotografía del voucher" className="mx-auto max-h-[70vh] w-auto object-contain" />
          </button>
          <div className="space-y-1 p-3 text-xs text-slate-500">
            <div>ID: {record.id}</div>
            <div>Cargado por {record.creado_por} el {formatDateTime(record.creado_en)}</div>
            {record.actualizado_en !== record.creado_en && (
              <div>Modificado por {record.actualizado_por} el {formatDateTime(record.actualizado_en)}</div>
            )}
            {record.foto_url && !record.foto_url.startsWith("/") && (
              <a className="text-brand-700 underline" href={record.foto_url} target="_blank" rel="noreferrer">Abrir foto original en Drive</a>
            )}
          </div>
        </div>

        <div className="card p-4">
          {editing && draft ? (
            <>
              <div className="mb-3">
                <label className="label">Estado</label>
                <select className="input" value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
                  {ESTADOS.map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
              <VoucherForm value={draft} onChange={setDraft} />
              <div className="mt-4 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setEditing(false)} disabled={busy}>Cancelar</button>
                <button className="btn-primary flex-1" onClick={saveEdit} disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
              </div>
            </>
          ) : (
            <>
              {FIELD_SECTIONS.map((section) => (
                <div key={section.title} className="mb-4">
                  <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{section.title}</h2>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                    {section.fields.map((f) => (
                      <div key={f.key} className={`border-b border-slate-100 pb-1.5 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                        <dt className="text-xs text-slate-500">{f.label}</dt>
                        <dd className={`whitespace-pre-wrap text-sm ${record[f.key] ? "text-slate-900" : "text-slate-400"}`}>
                          {(f.type === "weight" && record[f.key] ? formatKg(record[f.key]) : f.type === "date" ? formatDate(record[f.key]) : record[f.key]) || "No identificado"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              {canEdit && (
                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1" onClick={startEdit}>Editar</button>
                  {can(user.rol, "delete") && record.estado !== "Eliminado" && (
                    <button className="btn-danger flex-1" onClick={remove} disabled={busy}>Eliminar</button>
                  )}
                </div>
              )}
            </>
          )}
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoSrc} alt="Voucher" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
