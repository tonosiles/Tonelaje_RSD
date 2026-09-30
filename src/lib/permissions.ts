import type { Role } from "./types";

export type Action = "view" | "create" | "edit" | "delete" | "manageUsers";

const MATRIX: Record<Role, Action[]> = {
  admin: ["view", "create", "edit", "delete", "manageUsers"],
  usuario: ["view", "create"],
  consulta: ["view"],
};

export function can(role: Role | undefined, action: Action): boolean {
  return !!role && MATRIX[role]?.includes(action);
}
