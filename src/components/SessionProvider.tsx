"use client";
import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/session";

const Ctx = createContext<SessionUser | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export function useSession(): SessionUser {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession fuera de SessionProvider");
  return s;
}
