"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { VoucherRecord } from "@/lib/types";

/** Carga todos los registros visibles; los filtros se aplican en el navegador. */
export function useRecords() {
  const router = useRouter();
  const [records, setRecords] = useState<VoucherRecord[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/vouchers?todos=1", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (!res.ok) setError(json.error || "No se pudieron cargar los registros.");
    else setRecords(json.records);
  }, [router]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  return { records, error, reload: load };
}
