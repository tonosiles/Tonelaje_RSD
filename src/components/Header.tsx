"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./SessionProvider";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/types";

export function Header() {
  const user = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: "/", label: "Inicio" },
    ...(can(user.rol, "create") ? [{ href: "/escanear", label: "Escanear" }] : []),
    { href: "/historial", label: "Historial" },
    { href: "/dashboard", label: "Dashboard" },
    ...(can(user.rol, "manageUsers") ? [{ href: "/usuarios", label: "Usuarios" }] : []),
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span>Vouchers</span>
        </Link>
        <nav className="ml-4 hidden gap-1 md:flex">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold text-slate-800">{user.nombre}</div>
            <div className="text-xs text-slate-500">{ROLE_LABELS[user.rol]}</div>
          </div>
          <button onClick={logout} className="rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-slate-100" title="Cerrar sesión">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
