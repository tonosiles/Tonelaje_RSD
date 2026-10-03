"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VoucherForm } from "@/components/VoucherForm";
import type { DuplicateMatch } from "@/lib/duplicates";
import { formatDate, formatKg, recordTitle } from "@/lib/format";
import { preprocessImage, type Processed } from "@/lib/preprocess";
import type { VoucherData, VoucherField, VoucherRecord } from "@/lib/types";

type Step = "capture" | "reading" | "review" | "saving" | "saved";

interface Extraction {
  data: VoucherData;
  dudosos: VoucherField[];
  observaciones: string;
  es_voucher: boolean;
  simulado: boolean;
}

export function Scanner() {
  const [step, setStep] = useState<Step>("capture");
  const [error, setError] = useState("");
  const [images, setImages] = useState<Processed | null>(null);
  const [preview, setPreview] = useState("");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [data, setData] = useState<VoucherData | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [saved, setSaved] = useState<VoucherRecord | null>(null);
  const [showImage, setShowImage] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setStep("reading");
    try {
      const processed = await preprocessImage(file);
      setImages(processed);
      setPreview(URL.createObjectURL(processed.enhanced));
      const form = new FormData();
      form.append("image", processed.enhanced, "voucher.jpg");
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo leer el voucher.");
      setExtraction(json);
      setData(json.data);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la imagen.");
      setStep("capture");
    }
  }

  async function save(confirmDuplicate = false) {
    if (!images || !data) return;
    setError("");
    setStep("saving");
    const form = new FormData();
    form.append("data", JSON.stringify(data));
    form.append("photo", images.original, "voucher.jpg");
    if (confirmDuplicate) form.append("confirmarDuplicado", "1");
    const res = await fetch("/api/vouchers", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (res.status === 409) {
      setDuplicates(json.duplicates);
      setStep("review");
      return;
    }
    if (!res.ok) {
      setError(json.error || "No se pudo guardar.");
      setStep("review");
      return;
    }
    setDuplicates(null);
    setSaved(json.record);
    setStep("saved");
  }

  function restart() {
    setStep("capture");
    setImages(null);
    setPreview("");
    setExtraction(null);
    setData(null);
    setDuplicates(null);
    setSaved(null);
    setError("");
  }

  const inputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );

  if (step === "capture" || step === "reading") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 pt-2">
        {inputs}
        <h1 className="text-2xl font-bold">Escanear voucher</h1>
        {step === "reading" ? (
          <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
            <p className="text-lg font-semibold">Leyendo el voucher…</p>
            <p className="text-sm text-slate-500">Mejorando la imagen y extrayendo los datos con IA.</p>
          </div>
        ) : (
          <>
            <button className="btn-primary py-8 text-xl" onClick={() => cameraRef.current?.click()}>
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
              Tomar fotografía
            </button>
            <button className="btn-secondary py-5" onClick={() => fileRef.current?.click()}>
              Cargar imagen existente
            </button>
            <div className="rounded-xl bg-brand-50 p-4 text-sm text-slate-700">
              <p className="mb-1 font-semibold">Consejos para una mejor lectura</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>Apoye el voucher sobre una superficie oscura.</li>
                <li>Encuadre el voucher completo, sin cortar bordes.</li>
                <li>Evite reflejos y sombras fuertes.</li>
              </ul>
            </div>
          </>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  if (step === "saved" && saved) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 pt-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold">Voucher guardado</h1>
        <p className="text-slate-600">
          {recordTitle(saved)} · {formatKg(saved.peso_neto) || "Peso no identificado"}
        </p>
        <button className="btn-primary py-5 text-lg" onClick={restart}>Escanear otro voucher</button>
        <Link className="btn-secondary" href={`/historial/${saved.id}`}>Ver registro</Link>
        <Link className="text-sm text-brand-700 underline" href="/">Volver al inicio</Link>
      </div>
    );
  }

  // Revisión
  return (
    <div className="mx-auto max-w-3xl">
      {inputs}
      <h1 className="mb-3 text-2xl font-bold">Revisar información</h1>

      {extraction?.simulado && (
        <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Modo de prueba: los datos son simulados porque la IA aún no está configurada.
        </p>
      )}
      {extraction && !extraction.es_voucher && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          La imagen no parece ser un ticket de pesaje. Revise o vuelva a escanear.
        </p>
      )}
      {extraction?.observaciones && !extraction.simulado && (
        <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{extraction.observaciones}</p>
      )}

      <div className="mb-4 flex items-start gap-3">
        {preview && (
          <button onClick={() => setShowImage(true)} className="shrink-0" title="Ver imagen">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Voucher" className="h-28 w-20 rounded-lg border border-slate-200 object-cover" />
          </button>
        )}
        <p className="text-sm text-slate-600">
          Revise y corrija los datos antes de guardar. Los campos marcados con <span className="rounded bg-amber-100 px-1 text-amber-800">Verificar</span> se leyeron con dudas. Deje vacío lo que no aparezca en el voucher.
        </p>
      </div>

      {duplicates && duplicates.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Este voucher podría haber sido registrado anteriormente.</p>
          <ul className="mt-2 space-y-2">
            {duplicates.map((d) => (
              <li key={d.record.id} className="rounded-lg bg-white p-3 text-sm">
                <div className="font-medium">
                  {recordTitle(d.record)} · {formatKg(d.record.peso_neto)} · {formatDate(d.record.entrada_fecha || d.record.fecha)}
                </div>
                <div className="text-slate-500">
                  Cargado por {d.record.creado_por}. Coincide: {d.coincidencias.join(", ")}.{" "}
                  <a className="text-brand-700 underline" href={`/historial/${d.record.id}`} target="_blank" rel="noreferrer">Ver registro</a>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-secondary py-2 text-sm" onClick={() => setDuplicates(null)}>Revisar datos</button>
            <button className="btn-primary py-2 text-sm" onClick={() => save(true)}>Guardar de todos modos</button>
          </div>
        </div>
      )}

      {data && <VoucherForm value={data} onChange={setData} dudosos={extraction?.dudosos} />}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-3xl gap-3">
          <button className="btn-secondary flex-1" onClick={restart} disabled={step === "saving"}>Volver a escanear</button>
          <button className="btn-primary flex-1" onClick={() => save(false)} disabled={step === "saving"}>
            {step === "saving" ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {showImage && preview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowImage(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Voucher" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
