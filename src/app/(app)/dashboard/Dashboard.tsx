"use client";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FiltersBar, useFilters } from "@/components/Filters";
import { useSession } from "@/components/SessionProvider";
import { useRecords } from "@/components/useRecords";
import { applyFilters } from "@/lib/filters";
import { formatDate, formatMoney } from "@/lib/format";
import { can } from "@/lib/permissions";
import { computeStats } from "@/lib/stats";

const BRAND = "#2563eb";
const AXIS = { fontSize: 12, fill: "#64748b" };
const compact = (n: number) => new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function Dashboard() {
  const user = useSession();
  const [filters, setFilters] = useFilters();
  const { records, error } = useRecords();
  const filtered = useMemo(() => (records ? applyFilters(records, filters) : []), [records, filters]);
  const stats = useMemo(() => computeStats(filtered), [filtered]);

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Dashboard</h1>
      <FiltersBar filters={filters} onChange={setFilters} records={records ?? []} showEliminados={can(user.rol, "delete")} />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!records && !error && <p className="py-10 text-center text-slate-500">Cargando…</p>}
      {records && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Vouchers registrados" value={stats.total.toLocaleString("es-CL")} />
            <Tile label="Monto total acumulado" value={formatMoney(stats.montoTotal)} />
            <Tile label="Registrados hoy" value={stats.hoy.toLocaleString("es-CL")} />
            <Tile label="Registrados este mes" value={stats.mes.toLocaleString("es-CL")} />
          </div>

          <Panel title="Evolución de montos por fecha">
            {stats.porFecha.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={stats.porFecha} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="fecha" tick={AXIS} tickFormatter={(d: string) => formatDate(d).slice(0, 5)} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} minTickGap={24} />
                  <YAxis tick={AXIS} tickFormatter={compact} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    formatter={(v) => [formatMoney(Number(v)), "Monto"]}
                    labelFormatter={(d) => formatDate(String(d))}
                    contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
                  />
                  <Area type="monotone" dataKey="monto" stroke={BRAND} strokeWidth={2} fill={BRAND} fillOpacity={0.12} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Monto por comercio">
              <HBar data={stats.porComercio.slice(0, 10).map((c) => ({ nombre: c.nombre, valor: c.monto }))} money />
            </Panel>
            <Panel title="Registros por comercio">
              <HBar data={[...stats.porComercio].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10).map((c) => ({ nombre: c.nombre, valor: c.cantidad }))} />
            </Panel>
            <Panel title="Registros por usuario">
              <HBar data={stats.porUsuario.slice(0, 10).map((u) => ({ nombre: u.nombre, valor: u.cantidad }))} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 truncate text-2xl font-bold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="py-8 text-center text-sm text-slate-400">Sin datos para mostrar</p>;
}

function HBar({ data, money }: { data: { nombre: string; valor: number }[]; money?: boolean }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
        <CartesianGrid stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickFormatter={money ? compact : undefined} allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="nombre" tick={AXIS} width={120} tickLine={false} axisLine={false} tickFormatter={(s: string) => (s.length > 16 ? s.slice(0, 15) + "…" : s)} />
        <Tooltip
          cursor={{ fill: "#eef5ff" }}
          formatter={(v) => [money ? formatMoney(Number(v)) : Number(v).toLocaleString("es-CL"), money ? "Monto" : "Registros"]}
          contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
        />
        <Bar dataKey="valor" fill={BRAND} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
