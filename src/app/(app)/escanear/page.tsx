import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Scanner } from "./Scanner";

export default async function EscanearPage() {
  const user = await getSession();
  if (!can(user?.rol, "create")) redirect("/");
  return <Scanner />;
}
