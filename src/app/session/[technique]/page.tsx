// app/session/[technique]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function TechniqueSessionPage() {
  const router = useRouter();
  const { technique } = useParams<{ technique: string }>(); // ✅ inside component
  const tech = String(technique || "jab").toLowerCase();

  const [ready, setReady] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");
      setReady(true);
    })();
  }, [router]);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setRunning(true);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  }

  async function endSession() {
    stopCamera();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/login");
    await supabase.from("sessions").insert([{ user_id: user.id, technique: tech, duration_seconds: seconds }]);
    router.replace("/history");
  }

  if (!ready) return null;

  return (
    <main className="min-h-screen text-white">
      <h1 className="pt-28 text-3xl font-bold text-center">{tech[0].toUpperCase()+tech.slice(1)} Session</h1>
      <div className="max-w-5xl mx-auto p-6">
        <video ref={videoRef} className="w-full rounded-xl bg-black aspect-video" muted playsInline />
        <div className="mt-4 flex gap-3">
          {!running ? (
            <button onClick={startCamera} className="px-4 py-2 bg-pink-600 rounded">Start Camera</button>
          ) : (
            <button onClick={stopCamera} className="px-4 py-2 bg-white/10 rounded">Pause</button>
          )}
          <button onClick={endSession} className="px-4 py-2 bg-white/10 rounded">End Session & Save</button>
          <div className="ml-auto text-2xl tabular-nums">
            {String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}
          </div>
        </div>
      </div>
    </main>
  );
}
