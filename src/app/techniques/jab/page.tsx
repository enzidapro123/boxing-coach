// app/techniques/jab/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type Stance = "orthodox" | "southpaw";

export default function JabIntroductionPage() {
  const [stance, setStance] = useState<Stance>("orthodox");

  return (
    <div className="min-h-screen px-6 py-8 bg-gradient-to-br from-pink-200 via-fuchsia-200 to-purple-200">
      <div className="mx-auto max-w-5xl">
        {/* Top actions */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link
            href="/training"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-white font-semibold shadow-md"
            style={{
              background:
                "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
            }}
          >
            ← Back to Training
          </Link>

          <Link
            href={`/session/jab?stance=${stance}`}
            className="inline-flex items-center gap-2 rounded-full border-2 bg-white px-4 py-2 font-semibold text-neutral-900 hover:bg-red-50 transition"
            style={{ borderColor: "var(--primary-color, #ef4444)" }}
          >
            Start Jab Session
            <span className="text-xs text-neutral-500">({stance})</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-fuchsia-300 bg-white/80 backdrop-blur p-6 md:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Jab Introduction
              </h1>
              <p className="mt-3 text-neutral-700 max-w-2xl">
                The jab is your quickest straight punch and is commonly used to
                measure distance, interrupt rhythm, and set up combinations.
                This page introduces the basic form before you begin AI pose
                feedback.
              </p>
            </div>

            {/* Stance selector (new feature starting here) */}
            <div className="rounded-2xl border bg-white p-4 min-w-[260px] shadow-sm">
              <div className="text-sm font-semibold text-neutral-800 mb-3">
                Select your jab stance
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStance("orthodox")}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold border transition ${
                    stance === "orthodox"
                      ? "bg-black text-white border-black"
                      : "bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  Orthodox
                </button>
                <button
                  type="button"
                  onClick={() => setStance("southpaw")}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold border transition ${
                    stance === "southpaw"
                      ? "bg-black text-white border-black"
                      : "bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  Southpaw
                </button>
              </div>

              <p className="mt-3 text-xs text-neutral-600 leading-relaxed">
                This determines which hand is treated as the lead hand during
                jab evaluation.
              </p>
            </div>
          </div>

          {/* Intro content */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border bg-white p-5">
              <h2 className="font-semibold text-lg">
                How to perform a basic jab
              </h2>
              <ol className="mt-3 space-y-2 text-sm text-neutral-700 list-decimal list-inside">
                <li>Start in guard stance with hands protecting the face.</li>
                <li>Extend the lead hand straight toward the target.</li>
                <li>Keep the punching shoulder aligned and chin protected.</li>
                <li>Retract the hand quickly back to guard.</li>
              </ol>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <h2 className="font-semibold text-lg">
                What the System checks (jab)
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-neutral-700 list-disc list-inside">
                <li>Correct lead hand based on stance (orthodox/southpaw)</li>
                <li>Arm extension and return cycle (rep detection)</li>
                <li>Elbow straightening during extension</li>
                <li>Wrist/shoulder alignment consistency</li>
              </ul>
            </div>

            <div className="rounded-2xl border bg-white p-5 md:col-span-2">
              <h2 className="font-semibold text-lg">
                Tips before pressing Start
              </h2>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-neutral-50 p-3 border">
                  <div className="font-semibold">Camera Position</div>
                  <p className="mt-1 text-neutral-600">
                    Keep your upper body fully visible and face the camera.
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3 border">
                  <div className="font-semibold">Lighting</div>
                  <p className="mt-1 text-neutral-600">
                    Use bright front lighting so joints are easier to detect.
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3 border">
                  <div className="font-semibold">Space</div>
                  <p className="mt-1 text-neutral-600">
                    Make sure your hands stay inside the frame during extension.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/session/jab?stance=${stance}`}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-white font-semibold shadow-md hover:scale-[1.02] transition"
              style={{
                background:
                  "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
              }}
            >
              Start Jab Session ({stance})
            </Link>

            <Link
              href="/training"
              className="inline-flex items-center gap-2 rounded-full border px-6 py-3 font-semibold text-neutral-800 bg-white hover:bg-neutral-50 transition"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
