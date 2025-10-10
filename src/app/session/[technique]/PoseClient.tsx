"use client";
import { drawKeypoints, drawSkeleton, drawBBoxAndLabel } from "../_pose/draw";
import { useEffect, useRef, useState, useCallback } from "react";
import * as posedetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";

import { JabCounter, elbowAngleRight } from "../_pose/math";
import { supabase } from "@/app/lib/supabaseClient";

type TechniqueName = "jab" | "cross" | "hook" | "uppercut";
type Props = { technique: TechniqueName };

export default function PoseClient({ technique }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<posedetection.PoseDetector | null>(null);
  const rafRef = useRef<number | null>(null);

  const [running, setRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const jabCounterRef = useRef(new JabCounter());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);

  // ---------------- Backend ----------------
  const initBackend = useCallback(async () => {
    const tf = await import("@tensorflow/tfjs-core");
    await tf.setBackend("webgl");
    await tf.ready();
    console.log("✅ TFJS backend ready (webgl)");
  }, []);

  // ---------------- Camera ----------------
  const initCamera = useCallback(async () => {
    const video = videoRef.current!;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    if (video.readyState < 2) {
      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          video.removeEventListener("loadeddata", onLoaded);
          resolve();
        };
        video.addEventListener("loadeddata", onLoaded);
      });
    }
    console.log("🎥 Camera ready:", video.videoWidth, "x", video.videoHeight);
    return video;
  }, []);

  // ---------------- Pose Detector (MoveNet) ----------------
  const initDetector = useCallback(async () => {
    const detector = await posedetection.createDetector(
      posedetection.SupportedModels.MoveNet,
      {
        modelType: "SinglePose.Lightning",
        enableSmoothing: true,
      } as any
    );
    console.log("🤖 MoveNet Lightning model ready");
    return detector;
  }, []);

  // ---------------- Supabase Helpers ----------------
  const startSupabaseSession = useCallback(async (technique: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;
    if (!user) {
      console.warn("⚠️ No user logged in — local-only mode.");
      return `local-${crypto.randomUUID()}`;
    }

    const payload = {
      user_id: user.id,
      technique,
      started_at: new Date().toISOString(),
      total_reps: 0,
    };
    const { data, error } = await supabase
      .from("training_sessions")
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("⚠️ Supabase insert warning:", error);
      return `local-${crypto.randomUUID()}`;
    }
    console.log("✅ Session created:", data);
    return (data?.id as string) ?? `local-${crypto.randomUUID()}`;
  }, []);

  const logRep = useCallback(
    async (sid: string, technique: string, angle: number | null) => {
      if (sid.startsWith("local-")) return;
      await supabase.from("rep_events").insert({
        session_id: sid,
        technique,
        rep_at: new Date().toISOString(),
        feature_peak_angle: angle,
      });
    },
    []
  );

  const finishSupabaseSession = useCallback(
    async (sid: string, totalReps: number, startedAtMs: number) => {
      if (sid.startsWith("local-")) return;
      const durationSec = Math.max(
        0,
        Math.round((Date.now() - startedAtMs) / 1000)
      );
      await supabase
        .from("training_sessions")
        .update({
          finished_at: new Date().toISOString(),
          total_reps: totalReps,
          duration_sec: durationSec,
        })
        .eq("id", sid);
    },
    []
  );

  // ---------------- Drawing ----------------
  const draw = (poses: posedetection.Pose[]) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const video = videoRef.current!;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (poses.length && poses[0].keypoints?.length) {
      const kps = poses[0].keypoints as posedetection.Keypoint[];
      drawSkeleton(ctx, kps);
      drawKeypoints(ctx, kps);
      drawBBoxAndLabel(ctx, kps);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(8, 8, 210, 48);
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.fillText("No skeleton detected", 16, 28);
      ctx.fillText("Try better lighting or move back", 16, 48);
    }

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(8, canvas.height - 58, 170, 50);
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.fillText(`Technique: ${technique}`, 16, canvas.height - 34);
    ctx.fillText(`Reps: ${reps}`, 16, canvas.height - 14);
  };

  // ---------------- Loop ----------------
  const loop = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current) return;
    const poses = await detectorRef.current.estimatePoses(videoRef.current, {
      flipHorizontal: true,
      maxPoses: 1,
    });

    console.debug("poses:", poses?.length ?? 0, poses?.[0]?.keypoints?.[0]);

    if (poses[0]) {
      const nextCount = jabCounterRef.current.update(poses[0].keypoints);
      if (nextCount > reps) {
        const angle = elbowAngleRight(poses[0].keypoints) ?? null;
        if (sessionId) logRep(sessionId, technique, angle).catch(() => {});
        setReps(nextCount);
      }
    }

    draw(poses);
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, reps, sessionId, technique, logRep]);

  // ---------------- Start / Stop ----------------
  const start = useCallback(async () => {
    if (running) return;
    setRunning(true);
    await initBackend();
    const video = await initCamera();
    detectorRef.current = await initDetector();

    // warm-up
    for (let i = 0; i < 3; i++) {
      await detectorRef.current.estimatePoses(video, {
        flipHorizontal: true,
        maxPoses: 1,
      });
    }

    const sid = await startSupabaseSession(technique);
    setSessionId(sid);
    setStartedAtMs(Date.now());
    rafRef.current = requestAnimationFrame(loop);
  }, [
    running,
    initBackend,
    initCamera,
    initDetector,
    startSupabaseSession,
    technique,
    loop,
  ]);

  const stop = useCallback(async () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setRunning(false);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    detectorRef.current?.dispose();
    detectorRef.current = null;
    if (sessionId && startedAtMs != null) {
      await finishSupabaseSession(sessionId, reps, startedAtMs);
    }
  }, [sessionId, startedAtMs, reps, finishSupabaseSession]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      detectorRef.current?.dispose();
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ---------------- UI ----------------
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        {!running ? (
          <button
            className="px-4 py-2 rounded bg-black text-white"
            onClick={start}
          >
            Start now
          </button>
        ) : (
          <button className="px-4 py-2 rounded bg-gray-200" onClick={stop}>
            Stop
          </button>
        )}
        <div className="px-3 py-2 border rounded">Reps: {reps}</div>
      </div>
      <div className="relative w-full max-w-[900px]">
        <video ref={videoRef} className="w-full rounded" playsInline muted />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded"
        />
      </div>
    </div>
  );
}
