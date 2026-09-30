import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/Header";
import { SessionProvider } from "@/components/SessionProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <SessionProvider user={user}>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-10">{children}</main>
    </SessionProvider>
  );
}
