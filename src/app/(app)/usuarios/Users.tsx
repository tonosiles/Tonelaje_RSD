"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { ROLES, ROLE_LABELS, type PublicUser, type Role } from "@/lib/types";

const ROLE_HELP: Record<Role, string> = {
  admin: "Ve, crea, edita y elimina registros; administra usuarios.",
  usuario: "Carga vouchers y consulta registros.",
  consulta: "Solo visualiza información.",
};

export function Users() {
  const me = useSession();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ usuario: "", nombre: "", rol: "usuario" as Role, password: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setUsers(json.users);
    else setError(json.error);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json();
    if (!res.ok) return setError(json.error);
    setForm({ usuario: "", nombre: "", rol: "usuario", password: "" });
    setMsg(`Usuario ${json.user.usuario} creado.`);
    load();
  }

  async function patch(id: string, body: Record<string, unknown>, done?: string) {
    setError("");
    setMsg("");
    const res = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) return setError(json.error);
    if (done) setMsg(done);
    load();
  }

  function resetPassword(u: PublicUser) {
    const password = prompt(`Nueva contraseña para ${u.usuario} (mínimo 8 caracteres):`);
    if (password) patch(u.id, { password }, "Contraseña actualizada.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {msg && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p>}

      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className={`card flex flex-wrap items-center gap-3 p-3 ${u.activo ? "" : "opacity-60"}`}>
            <div className="mr-auto min-w-0">
              <div className="font-semibold">{u.nombre} <span className="font-normal text-slate-500">({u.usuario})</span></div>
              {!u.activo && <div className="text-xs text-red-600">Desactivado</div>}
            </div>
            <select className="input w-auto py-1.5 text-sm" value={u.rol} disabled={u.id === me.uid} onChange={(e) => patch(u.id, { rol: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => resetPassword(u)}>Contraseña</button>
            {u.id !== me.uid && (
              <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => patch(u.id, { activo: !u.activo })}>
                {u.activo ? "Desactivar" : "Activar"}
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={create} className="card grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Nuevo usuario</h2>
        <div>
          <label className="label">Usuario</label>
          <input className="input" autoCapitalize="none" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} required />
        </div>
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </div>
        <div>
          <label className="label">Perfil</label>
          <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-500">{ROLE_HELP[form.rol]}</p>
        </div>
        <div>
          <label className="label">Contraseña inicial</label>
          <input className="input" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button className="btn-primary sm:col-span-2">Crear usuario</button>
      </form>
    </div>
  );
}
