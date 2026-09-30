import Link from "next/link";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function Home() {
  const user = (await getSession())!;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 pt-4">
      <p className="text-slate-600">Hola, {user.nombre.split(" ")[0]}</p>
      {can(user.rol, "create") && (
        <Link
          href="/escanear"
          className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-brand-600 px-6 py-12 text-white shadow-lg shadow-brand-600/20 transition active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
          <span className="text-2xl font-bold">Escanear voucher</span>
          <span className="text-sm text-brand-100">Tome una foto o cargue una imagen</span>
        </Link>
      )}
      <div className="grid grid-cols-3 gap-3">
        <HomeLink href="/historial" label="Historial" icon="M4 6h16M4 12h16M4 18h10" />
        <HomeLink href="/historial?buscar=1" label="Buscar" icon="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4" />
        <HomeLink href="/dashboard" label="Dashboard" icon="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </div>
    </div>
  );
}

function HomeLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="card flex flex-col items-center gap-2 px-2 py-5 text-slate-700 transition active:scale-[0.98]">
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={icon} />
      </svg>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}
