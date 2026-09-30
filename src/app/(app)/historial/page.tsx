import { Suspense } from "react";
import { History } from "./History";

export default function HistorialPage() {
  return (
    <Suspense>
      <History />
    </Suspense>
  );
}
