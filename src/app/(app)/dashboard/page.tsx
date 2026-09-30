import { Suspense } from "react";
import { Dashboard } from "./Dashboard";

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
