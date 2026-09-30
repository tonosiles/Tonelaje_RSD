import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Users } from "./Users";

export default async function UsuariosPage() {
  const user = await getSession();
  if (!can(user?.rol, "manageUsers")) redirect("/");
  return <Users />;
}
