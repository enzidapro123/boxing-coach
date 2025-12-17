// app/summary/page.tsx
import { Suspense } from "react";
import SummaryClient from "./summaryclient";

export default function SummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white text-neutral-700">
          Preparing your summary…
        </div>
      }
    >
      <SummaryClient />
    </Suspense>
  );
}
