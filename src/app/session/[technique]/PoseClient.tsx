"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawBBoxAndLabel, drawKeypoints, drawSkeleton } from "../_pose/draw";
import { supabase } from "../../lib/supabaseClient";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { useRouter } from "next/navigation";
import { audit } from "@/app/lib/audit"; // make sure this exists

/* -------------------------------------------------- Types */
type TechniqueName = "jab" | "cross" | "hook" | "uppercut" | "guard";
type Stance = "orthodox" | "southpaw";
type Props = { technique: TechniqueName; stance?: Stance };
type KP = { x: number; y: number; z?: number; score?: number; name?: string };
type Arm = "left" | "right";
type LogItem = { ts: number; kind: "ok" | "warn"; text: string };
type LogDraft = Omit<LogItem, "ts">;

/* -------------------------- Landmark names (33) */
const NAMES = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
] as const;

/* -------------------------------------------------- Helpers */
function syncCanvasToCSS(canvas: HTMLCanvasElement) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

/** Convert normalized [0..1] → pixel coords for the *canvas* size (mirror X). */
function toKeypoints(
  landmarks:
    | { x: number; y: number; z?: number; visibility?: number }[]
    | undefined,
  canvasW: number,
  canvasH: number
): KP[] {
  if (!landmarks || !landmarks.length) return [];
  return landmarks.map((p, i) => {
    const x = canvasW - p.x * canvasW; // mirror X
    const y = p.y * canvasH;
    const score = typeof p.visibility === "number" ? p.visibility : 0.9;
    return { x, y, z: p.z, score, name: NAMES[i] as string };
  });
}

/* Geometry */
function dist(a?: KP, b?: KP) {
  if (!a || !b) return NaN;
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
}
function angleDeg(a?: KP, b?: KP, c?: KP) {
  if (!a || !b || !c) return NaN;
  const abx = a.x! - b.x!,
    aby = a.y! - b.y!;
  const cbx = c.x! - b.x!,
    cby = c.y! - b.y!;
  const dot = abx * cbx + aby * cby;
  const mab = Math.hypot(abx, aby),
    mcb = Math.hypot(cbx, cby);
  if (!mab || !mcb) return NaN;
  let cos = dot / (mab * mcb);
  cos = Math.min(1, Math.max(-1, cos));
  return (Math.acos(cos) * 180) / Math.PI;
}

/* Lead arm helper */
const leadArm = (stance?: Stance): Arm =>
  stance === "southpaw" ? "right" : "left";

/* -------------------------------------------------- Component */
export default function PoseClient({ technique, stance }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reps, setReps] = useState(0);
  const [log, setLog] = useState<LogItem[]>([]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const router = useRouter();

  /* ---------- Punch/cross state */
  const lastRatio = useRef<{ left: number; right: number }>({
    left: 0,
    right: 0,
  });
  const phase = useRef<{
    left: "idle" | "extending";
    right: "idle" | "extending";
  }>({
    left: "idle",
    right: "idle",
  });
  const peak = useRef<{
    left: { ratio: number; elbow: number; align: number } | null;
    right: { ratio: number; elbow: number; align: number } | null;
  }>({ left: null, right: null });

  /* ---------- Hook state */
  const hookLastLat = useRef<{ left: number; right: number }>({
    left: 0,
    right: 0,
  });
  const hookPhase = useRef<{
    left: "idle" | "swinging";
    right: "idle" | "swinging";
  }>({
    left: "idle",
    right: "idle",
  });
  const hookPeak = useRef<{
    left: {
      lateral: number;
      elbow: number;
      align: number;
      reach: number;
    } | null;
    right: {
      lateral: number;
      elbow: number;
      align: number;
      reach: number;
    } | null;
  }>({ left: null, right: null });

  /* ---------- Uppercut (+ smoothing) */
  const upLastRise = useRef<{ left: number; right: number }>({
    left: 0,
    right: 0,
  });
  const upPhase = useRef<{ left: "idle" | "rising"; right: "idle" | "rising" }>(
    {
      left: "idle",
      right: "idle",
    }
  );
  const upPeak = useRef<{
    left: {
      rise: number;
      elbow: number;
      lateral: number;
      reach: number;
    } | null;
    right: {
      rise: number;
      elbow: number;
      lateral: number;
      reach: number;
    } | null;
  }>({ left: null, right: null });
  const upEmaRise = useRef<{ left: number; right: number }>({
    left: 0,
    right: 0,
  });
  const upPrevEma = useRef<{ left: number; right: number }>({
    left: 0,
    right: 0,
  });

  /* ---------- Guard timing + rate-limited hints */
  const guardLastTs = useRef<number | null>(null);
  const guardAccumMs = useRef(0);
  const guardWasUp = useRef(false);
  const guardLastHintTs = useRef(0);
  const guardSecondsRef = useRef(0);
  const guardState = useRef<"searching" | "holding">("searching");
  const guardAttempt = useRef<{
    startTs: number | null;
    heldMs: number;
    lastBothOkTs: number | null;
  }>({ startTs: null, heldMs: 0, lastBothOkTs: null });
  const guardBadHand = useRef<"left" | "right" | "both" | null>(null);
  /* -------------------------------- camera -------------------------------- */
  const initCamera = useCallback(async () => {
    const video = videoRef.current!;
    (video.srcObject as MediaStream | null)
      ?.getTracks()
      .forEach((t) => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640, max: 640 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });
    video.srcObject = stream;
    try {
      await video.play();
    } catch {}
    if (video.readyState < 2) {
      await new Promise<void>((res) =>
        video.addEventListener("loadeddata", () => res(), { once: true })
      );
    }
    return video;
  }, []);

  /* --------------------------- mediapipe landmarker ------------------------ */
  const initLandmarker = useCallback(async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const lm = await PoseLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return lm;
  }, []);

  /* ------------------------------- supabase ------------------------------- */
  const startSupabaseSession = useCallback(async (tech: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;
    if (!user) return `local-${crypto.randomUUID()}`;
    const payload = {
      user_id: user.id,
      technique: tech,
      started_at: new Date().toISOString(),
      total_reps: 0,
    };
    const { data, error } = await supabase
      .from("training_sessions")
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) {
      console.warn("Supabase warning:", error);
      return `local-${crypto.randomUUID()}`;
    }
    return (data?.id as string) ?? `local-${crypto.randomUUID()}`;
  }, []);

  const finishSupabaseSession = useCallback(
    async (sid: string, totalReps: number, startedAt: number) => {
      if (sid.startsWith("local-")) return;
      const durationSec = Math.max(
        0,
        Math.round((Date.now() - startedAt) / 1000)
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

  /* -------------------------------- drawing ------------------------------- */
  const draw = useCallback(
    (kps: KP[]) => {
      const canvas = canvasRef.current!;
      const video = videoRef.current!;
      const { ctx, width, height } = syncCanvasToCSS(canvas);
      if (!video.videoWidth || !video.videoHeight) return;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -width, 0, width, height);
      ctx.restore();

      if (!kps.length) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(8, 8, 260, 46);
        ctx.fillStyle = "#fff";
        ctx.font = "14px sans-serif";
        ctx.fillText("No pose detected", 16, 30);
        ctx.fillText("Move closer to camera", 16, 46);
      } else {
        drawSkeleton(ctx, kps as any);
        drawKeypoints(ctx, kps as any);
        drawBBoxAndLabel(ctx, kps as any);
      }

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(8, height - 58, 220, 50);
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Technique: ${technique}`, 16, height - 34);
      ctx.fillText(
        `${technique === "guard" ? "Hold (s)" : "Reps"}: ${reps}`,
        16,
        height - 14
      );
    },
    [technique, reps]
  );

  /* ----------------------------- Shared helpers --------------------------- */
  function kpMap(kps: KP[]) {
    const m: Record<string, KP> = {};
    for (const k of kps) if (k?.name) m[k.name] = k;
    return m;
  }
  function evalArm(kps: KP[], arm: Arm) {
    const k = kpMap(kps);
    const s = k[`${arm}_shoulder`];
    const e = k[`${arm}_elbow`];
    const w = k[`${arm}_wrist`];
    const ls = k["left_shoulder"],
      rs = k["right_shoulder"];
    const bodyScale = dist(ls, rs) || 1; // shoulder width
    const elbow = angleDeg(s, e, w); // straight ≈ 180
    const alignY = Math.abs((w?.y ?? 0) - (s?.y ?? 0)) / bodyScale;
    const extension = dist(s, w) / bodyScale;
    const lateral = Math.abs((w?.x ?? 0) - (s?.x ?? 0)) / bodyScale;
    const rise = ((s?.y ?? 0) - (w?.y ?? 0)) / bodyScale; // wrist above shoulder => positive
    return {
      elbow,
      alignY,
      extension,
      lateral,
      rise,
      bodyScale,
      s,
      e,
      w,
      ls,
      rs,
    };
  }

  const pushLog = (item: LogDraft) =>
    setLog((prev) => {
      const next = [{ ...item, ts: Date.now() }, ...prev];
      return next.slice(0, 12);
    });

  /* ----------------------------- Jab (lead-only) -------------------------- */
  function processJab(kps: KP[]) {
    if (!kps.length) return;
    const L = evalArm(kps, "left");
    const R = evalArm(kps, "right");
    const active: Arm = L.extension >= R.extension ? "left" : "right";
    const mustBe: Arm = leadArm(stance);
    if (active !== mustBe) {
      pushLog({
        kind: "warn",
        text: `Jab uses your ${mustBe} hand. Try again.`,
      });
      phase.current[active] = "idle";
      peak.current[active] = null;
      lastRatio.current[active] = 0;
      return;
    }
    const m = active === "left" ? L : R;

    const ratio = m.extension;
    const was = phase.current[active];
    const prev = lastRatio.current[active] || 0;

    const START_EXT = 0.9;
    const PEAK_MIN = 1.2;
    const DROP_FRAC = 0.1;

    if (was === "idle" && ratio > START_EXT && ratio > prev) {
      phase.current[active] = "extending";
      peak.current[active] = { ratio, elbow: m.elbow, align: m.alignY };
    }

    if (was === "extending") {
      if (peak.current[active] && ratio > peak.current[active]!.ratio) {
        peak.current[active] = { ratio, elbow: m.elbow, align: m.alignY };
      }
      const p = peak.current[active]!;
      if (p && ratio < p.ratio * (1 - DROP_FRAC)) {
        const straight = p.elbow >= 160;
        const aligned = p.align <= 0.18;
        const bigReach = p.ratio >= PEAK_MIN;
        if (straight && aligned && bigReach) {
          setReps((r) => r + 1);
          pushLog({ kind: "ok", text: `Correct jab (${mustBe} arm)` });
          {
            const sid = sessionIdRef.current;
            if (sid && !sid.startsWith("local-")) {
              supabase
                .from("session_reps")
                .insert({
                  session_id: sid /* , technique, user_id if no trigger */,
                })
                .then(({ error }) => {
                  if (error)
                    pushLog({
                      kind: "warn",
                      text: `Save failed: ${error.message}`,
                    });
                });
            }
          }
        } else {
          const tips = [
            straight ? null : "straighten elbow",
            aligned ? null : "keep wrist level with shoulder",
            bigReach ? null : "extend a bit more",
          ]
            .filter(Boolean)
            .join("; ");
          pushLog({ kind: "warn", text: `Adjust your jab: ${tips}` });
        }
        phase.current[active] = "idle";
        peak.current[active] = null;
      }
    }

    lastRatio.current[active] = ratio;
  }

  /* ----------------------------- Cross ------------------------------------ */
  function processCross(kps: KP[]) {
    if (!kps.length) return;
    const L = evalArm(kps, "left");
    const R = evalArm(kps, "right");
    const active: Arm = L.extension >= R.extension ? "left" : "right";
    const m = active === "left" ? L : R;

    const ratio = m.extension;
    const was = phase.current[active];
    const prev = lastRatio.current[active] || 0;

    const START_EXT = 0.9;
    const PEAK_MIN = 1.2;
    const DROP_FRAC = 0.1;

    if (was === "idle" && ratio > START_EXT && ratio > prev) {
      phase.current[active] = "extending";
      peak.current[active] = { ratio, elbow: m.elbow, align: m.alignY };
    }

    if (was === "extending") {
      if (peak.current[active] && ratio > peak.current[active]!.ratio) {
        peak.current[active] = { ratio, elbow: m.elbow, align: m.alignY };
      }
      const p = peak.current[active]!;
      if (p && ratio < p.ratio * (1 - DROP_FRAC)) {
        const straight = p.elbow >= 160;
        const aligned = p.align <= 0.18;
        const bigReach = p.ratio >= PEAK_MIN;
        if (straight && aligned && bigReach) {
          setReps((r) => r + 1);
          pushLog({ kind: "ok", text: `Correct cross (${active} arm)` });
          {
            const sid = sessionIdRef.current;
            if (sid && !sid.startsWith("local-")) {
              supabase
                .from("session_reps")
                .insert({ session_id: sid })
                .then(({ error }) => {
                  if (error)
                    pushLog({
                      kind: "warn",
                      text: `Save failed: ${error.message}`,
                    });
                });
            }
          }
        } else {
          const tips = [
            straight ? null : "straighten elbow",
            aligned ? null : "keep wrist level with shoulder",
            bigReach ? null : "extend a bit more",
          ]
            .filter(Boolean)
            .join("; ");
          pushLog({
            kind: "warn",
            text: `Adjust your cross (${active}): ${tips}`,
          });
        }
        phase.current[active] = "idle";
        peak.current[active] = null;
      }
    }

    lastRatio.current[active] = ratio;
  }

  /* ----------------------------- Hook ------------------------------------- */
  function processHook(kps: KP[]) {
    if (!kps.length) return;
    const L = evalArm(kps, "left");
    const R = evalArm(kps, "right");
    const active: Arm = L.lateral >= R.lateral ? "left" : "right";
    const m = active === "left" ? L : R;

    const lateral = m.lateral;
    const reach = m.extension;
    const was = hookPhase.current[active];
    const prevLat = hookLastLat.current[active] || 0;

    const START_LAT = 0.6;
    const PEAK_MIN_LAT = 0.9;
    const DROP_FRAC = 0.12;
    const ELBOW_MIN = 70;
    const ELBOW_MAX = 120;
    const ALIGN_Y_MAX = 0.25;
    const REACH_MAX = 1.4;

    if (was === "idle" && lateral > START_LAT && lateral > prevLat) {
      hookPhase.current[active] = "swinging";
      hookPeak.current[active] = {
        lateral,
        elbow: m.elbow,
        align: m.alignY,
        reach,
      };
    }

    if (was === "swinging") {
      if (
        hookPeak.current[active] &&
        lateral > hookPeak.current[active]!.lateral
      ) {
        hookPeak.current[active] = {
          lateral,
          elbow: m.elbow,
          align: m.alignY,
          reach,
        };
      }
      const p = hookPeak.current[active]!;
      if (p && lateral < p.lateral * (1 - DROP_FRAC)) {
        const elbowOk = p.elbow >= ELBOW_MIN && p.elbow <= ELBOW_MAX;
        const alignOk = p.align <= ALIGN_Y_MAX;
        const latOk = p.lateral >= PEAK_MIN_LAT;
        const notCross = p.reach <= REACH_MAX;
        if (elbowOk && alignOk && latOk && notCross) {
          setReps((r) => r + 1);
          pushLog({ kind: "ok", text: `Correct hook (${active} arm)` });
          {
            const sid = sessionIdRef.current;
            if (sid && !sid.startsWith("local-")) {
              supabase
                .from("session_reps")
                .insert({ session_id: sid })
                .then(({ error }) => {
                  if (error)
                    pushLog({
                      kind: "warn",
                      text: `Save failed: ${error.message}`,
                    });
                });
            }
          }
        } else {
          const tips = [
            elbowOk ? null : "bend elbow ~90°",
            alignOk ? null : "keep wrist level with shoulder",
            latOk ? null : "bring hook more around (lateral)",
            notCross ? null : "avoid overextending straight",
          ]
            .filter(Boolean)
            .join("; ");
          pushLog({
            kind: "warn",
            text: `Adjust your hook (${active}): ${tips}`,
          });
        }
        hookPhase.current[active] = "idle";
        hookPeak.current[active] = null;
      }
    }

    hookLastLat.current[active] = lateral;
  }

  /* --------------------------- Uppercut (improved) ------------------------ */
  function processUppercut(kps: KP[]) {
    if (!kps.length) return;
    const L = evalArm(kps, "left");
    const R = evalArm(kps, "right");
    const active: Arm = L.rise >= R.rise ? "left" : "right";
    const m = active === "left" ? L : R;

    const alpha = 0.4;
    const emaPrev = upEmaRise.current[active];
    const emaCurr = alpha * m.rise + (1 - alpha) * emaPrev;
    upEmaRise.current[active] = emaCurr;
    const vel = emaCurr - (upPrevEma.current[active] ?? 0);
    upPrevEma.current[active] = emaCurr;

    const START_RISE = 0.15;
    const PEAK_MIN_R = 0.4;
    const DROP_FRAC = 0.12;
    const VEL_MIN = 0.02;
    const ELBOW_MIN = 55;
    const ELBOW_MAX = 125;
    const LATERAL_MAX = 0.75;
    const REACH_MAX = 1.25;

    const was = upPhase.current[active];
    const prevRise = upLastRise.current[active] || 0;

    const startCondition =
      (emaCurr > START_RISE || vel > VEL_MIN) && emaCurr > prevRise;

    if (was === "idle" && startCondition) {
      upPhase.current[active] = "rising";
      upPeak.current[active] = {
        rise: emaCurr,
        elbow: m.elbow,
        lateral: m.lateral,
        reach: m.extension,
      };
    }

    if (was === "rising") {
      if (upPeak.current[active] && emaCurr > upPeak.current[active]!.rise) {
        upPeak.current[active] = {
          rise: emaCurr,
          elbow: m.elbow,
          lateral: m.lateral,
          reach: m.extension,
        };
      }
      const p = upPeak.current[active]!;
      if (p && emaCurr < p.rise * (1 - DROP_FRAC)) {
        const elbowOk = p.elbow >= ELBOW_MIN && p.elbow <= ELBOW_MAX;
        const vertical = p.lateral <= LATERAL_MAX;
        const riseOk = p.rise >= PEAK_MIN_R;
        const notCross = p.reach <= REACH_MAX;
        if (elbowOk && vertical && riseOk && notCross) {
          setReps((r) => r + 1);
          pushLog({ kind: "ok", text: `Correct uppercut (${active} arm)` });
          {
            const sid = sessionIdRef.current;
            if (sid && !sid.startsWith("local-")) {
              supabase
                .from("session_reps")
                .insert({ session_id: sid })
                .then(({ error }) => {
                  if (error)
                    pushLog({
                      kind: "warn",
                      text: `Save failed: ${error.message}`,
                    });
                });
            }
          }
        } else {
          const tips = [
            elbowOk ? null : "keep elbow ~90° (don’t straighten)",
            vertical ? null : "drive upward (less around the side)",
            riseOk ? null : "lift higher through the target",
            notCross ? null : "avoid overextending forward",
          ]
            .filter(Boolean)
            .join("; ");
          pushLog({
            kind: "warn",
            text: `Adjust your uppercut (${active}): ${tips}`,
          });
        }
        upPhase.current[active] = "idle";
        upPeak.current[active] = null;
      }
    }

    upLastRise.current[active] = emaCurr;
  }

  /* ----------------------------- Guard (hold + hints) --------------------- */
  /* ----------------------------- Guard (3 hand dots vs 9 face dots) --------------------- */
  function processGuard(kps: KP[]) {
    if (!kps.length) return;

    const k = kpMap(kps);
    const L = evalArm(kps, "left");
    const R = evalArm(kps, "right");

    // 🎯 Face keypoints to detect contact
    const faceKeys = [
      "left_eye_inner",
      "left_eye",
      "left_eye_outer",
      "right_eye_inner",
      "right_eye",
      "right_eye_outer",
      "mouth_left",
      "mouth_right",
      "nose",
    ] as const;

    const facePts = faceKeys.map((n) => k[n as string]).filter(Boolean) as KP[];
    if (facePts.length < 3) return;

    // Estimate face width (for detection radius)
    const le = k["left_eye"],
      re = k["right_eye"];
    const ml = k["mouth_left"],
      mr = k["mouth_right"];
    const faceWidth =
      (le && re && dist(le, re)) ||
      (ml && mr && dist(ml, mr)) ||
      (() => {
        const xs = facePts.map((p) => p.x);
        return Math.max(...xs) - Math.min(...xs);
      })();

    const S = L.bodyScale || R.bodyScale || 1;
    const RADIUS = Math.max(0.18 * S, 0.95 * faceWidth); // sensitivity radius

    // 🖐️ Hand keypoints (3 per hand)
    const leftHandPts = [
      k["left_wrist"],
      k["left_index"],
      k["left_thumb"],
    ].filter(Boolean) as KP[];
    const rightHandPts = [
      k["right_wrist"],
      k["right_index"],
      k["right_thumb"],
    ].filter(Boolean) as KP[];

    if (!leftHandPts.length || !rightHandPts.length) return;

    // Minimum distance between hand point and any face point
    const minDistToFace = (points: KP[]) =>
      Math.min(...points.flatMap((p) => facePts.map((f) => dist(p, f))));

    const dL = minDistToFace(leftHandPts);
    const dR = minDistToFace(rightHandPts);

    const leftOK = Number.isFinite(dL) && dL <= RADIUS;
    const rightOK = Number.isFinite(dR) && dR <= RADIUS;
    const bothOK = leftOK && rightOK;

    // ⏱️ Time-based guard accumulation
    const now = performance.now();
    const last = guardLastTs.current ?? now;
    const dt = now - last;
    guardLastTs.current = now;

    if (bothOK) {
      guardAccumMs.current += dt;
      if (!guardWasUp.current) {
        pushLog({ kind: "ok", text: "Guard up — both hands covering face." });
        guardWasUp.current = true;
      }
      const STEP = 1000; // log every second
      while (guardAccumMs.current >= STEP) {
        setReps((r) => r + 1);
        guardAccumMs.current -= STEP;
        pushLog({ kind: "ok", text: "Guard maintained — solid cover!" });
        {
          const sid = sessionIdRef.current;
          if (sid && !sid.startsWith("local-")) {
            supabase
              .from("session_reps")
              .insert({
                session_id: sid /* , technique, user_id if no trigger */,
              })
              .then(({ error }) => {
                if (error)
                  pushLog({
                    kind: "warn",
                    text: `Save failed: ${error.message}`,
                  });
              });
          }
        }
      }
    } else {
      const HINT_COOLDOWN = 800;
      if (now - guardLastHintTs.current >= HINT_COOLDOWN) {
        let tip = "Bring both hands to your face level.";
        if (leftOK && !rightOK)
          tip = "Bring your RIGHT hand closer to your face.";
        if (!leftOK && rightOK)
          tip = "Bring your LEFT hand closer to your face.";
        pushLog({ kind: "warn", text: tip });
        guardLastHintTs.current = now;
      }
      guardWasUp.current = false;
      guardAccumMs.current = 0;
    }
  }
  /* --------------------------------- loop -------------------------------- */
  const loop = useCallback(() => {
    if (!landmarkerRef.current || !videoRef.current) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const video = videoRef.current;
    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const result = landmarkerRef.current.detectForVideo(
      video,
      performance.now()
    );

    let kps: KP[] = [];
    if (result?.landmarks?.[0]?.length) {
      const { width: cw, height: ch } = syncCanvasToCSS(canvasRef.current!);
      kps = toKeypoints(result.landmarks[0], cw, ch);
    }

    draw(kps);

    if (kps.length) {
      if (technique === "jab") processJab(kps);
      if (technique === "cross") processCross(kps);
      if (technique === "hook") processHook(kps);
      if (technique === "uppercut") processUppercut(kps);
      if (technique === "guard") processGuard(kps);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [draw, technique, stance]);

  /* ------------------------------ start/stop ------------------------------ */
  const start = useCallback(async () => {
    if (running || loading) return;
    setLoading(true);
    setError(null);
    setReps(0);
    setLog([]);

    // reset guard timers each start
    guardAccumMs.current = 0;
    guardWasUp.current = false;
    guardLastTs.current = null;
    guardLastHintTs.current = 0;
    guardSecondsRef.current = 0;

    try {
      const video = await initCamera();
      landmarkerRef.current = await initLandmarker();
      try {
        landmarkerRef.current.detectForVideo(video, performance.now());
      } catch {}
      const sid = await startSupabaseSession(technique);
      await audit("session.start", { session_id: sid, technique });
      sessionIdRef.current = sid;
      setSessionId(sid);
      setStartedAtMs(Date.now());
      setRunning(true);
      setLoading(false);
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error("[start] failed:", err);
      setLoading(false);
      setRunning(false);
      setError("Failed to start. Check camera permissions and reload.");
    }

  }, [
    running,
    loading,
    initCamera,
    initLandmarker,
    startSupabaseSession,
    technique,
    loop,
    
  ]);

const stop = useCallback(async () => {
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  rafRef.current = null;
  setRunning(false);
  setLoading(false);

  // stop camera + landmarker
  (videoRef.current?.srcObject as MediaStream | null)
    ?.getTracks()
    .forEach((t) => t.stop());
  try { landmarkerRef.current?.close(); } catch {}
  landmarkerRef.current = null;

  // finalize the session
  const sid = sessionIdRef.current;
  const started = startedAtMs;
  const repCount = reps;

  sessionIdRef.current = null;

  try {
    if (sid && started != null) {
      // persist finish data in training_sessions
      await finishSupabaseSession(sid, repCount, started);

      // 🔎 AUDIT: log the UX event
      if (!sid.startsWith("local-")) {
        const durationSec = Math.max(0, Math.round((Date.now() - started) / 1000));
        try {
          await audit("session.finish", {
            session_id: sid,
            technique,
            total_reps: repCount ?? 0,
            duration_sec: durationSec,
          });
        } catch (e) {
          console.warn("audit session.finish failed", e);
        }
      }
    }
  } finally {
    // if you still auto-route, keep this; otherwise remove
    const qp = new URLSearchParams({
      sid: sid ?? "",
      technique,
      reps: String(repCount ?? 0),
    }).toString();
    router.push(`/summary?${qp}`);
  }
}, [finishSupabaseSession, reps, startedAtMs, technique, router]);

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          onClick={start}
          disabled={running || loading}
        >
          {loading ? "Initializing…" : running ? "Running…" : "Start now"}
        </button>

        {running && (
          <button className="px-4 py-2 rounded bg-gray-200" onClick={stop}>
            Stop
          </button>
        )}

        <div className="px-3 py-2 border rounded">
          {technique === "guard" ? "Hold (s)" : "Reps"}: {reps}
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Video + canvas */}
        <div className="relative w-full md:col-span-2">
          <video ref={videoRef} className="w-full rounded" playsInline muted />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full rounded pointer-events-none z-50"
          />
        </div>

        {/* Side log panel */}
        <div className="border rounded-lg p-3 h-[420px] overflow-auto bg-white/80">
          <div className="font-semibold mb-2">Technique log</div>
          {log.length === 0 ? (
            <div className="text-sm text-gray-500">
              Your feedback will appear here while you move.
            </div>
          ) : (
            <ul className="space-y-2">
              {log.map((item) => (
                <li key={item.ts} className="text-sm">
                  <span
                    className={
                      item.kind === "ok" ? "text-green-700" : "text-amber-700"
                    }
                  >
                    {item.kind === "ok" ? "✅" : "⚠️"}{" "}
                    {new Date(item.ts).toLocaleTimeString()} — {item.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
