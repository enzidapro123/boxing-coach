// src/app/session/_pose/draw.ts
import type * as posedetection from "@tensorflow-models/pose-detection";

type KP = posedetection.Keypoint;

// ↓ Lower threshold so points render even when confidence is modest
const THRESH = 0.12;

// Minimal set of edges to keep it clean & fast (shoulders, torso, arms, legs)
const EDGE_NAMES: [Left: string, Right: string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "right_hip"],

  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],

  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],

  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

/** BlazePose index by canonical name (33 points). */
const NAME_TO_INDEX: Record<string, number> = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouth_left: 9,
  mouth_right: 10,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_pinky: 17,
  right_pinky: 18,
  left_index: 19,
  right_index: 20,
  left_thumb: 21,
  right_thumb: 22,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32,
};

/** Get a keypoint by its semantic name, using .name if present, else our index map. */
function getKP(kps: KP[], name: string): KP | undefined {
  // Many detectors fill the `name` field. Prefer it.
  const byName = kps.find((k) => k.name === name);
  if (byName) return byName;
  // Fallback to index map (BlazePose order)
  const idx = NAME_TO_INDEX[name];
  return Number.isInteger(idx) ? kps[idx] : undefined;
}

// AFTER (type predicate)
function visible(k?: KP): k is KP {
  return !!k && (k.score ?? 0) >= THRESH;
}

export function drawKeypoints(ctx: CanvasRenderingContext2D, kps: KP[]) {
  ctx.save();
  for (const k of kps) {
    if (!visible(k)) continue;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,165,0,0.95)"; // orange
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSkeleton(ctx: CanvasRenderingContext2D, kps: KP[]) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgb(0 200 255)"; // cyan
  for (const [aName, bName] of EDGE_NAMES) {
    const a = getKP(kps, aName);
    const b = getKP(kps, bName);
    if (!visible(a) || !visible(b)) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBBoxAndLabel(ctx: CanvasRenderingContext2D, kps: KP[]) {
  const good = kps.filter(visible);
  if (!good.length) return;

  const xs = good.map((k) => k.x);
  const ys = good.map((k) => k.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const score = good.reduce((s, k) => s + (k.score ?? 0), 0) / good.length;

  ctx.save();
  // red rectangle
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgb(255 60 60)";
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

  // label background
  const label = `person  ${score.toFixed(2)}`;
  ctx.font = "14px sans-serif";
  const w = ctx.measureText(label).width + 10;
  const h = 18;
  ctx.fillStyle = "rgb(255 60 60)";
  ctx.fillRect(minX, Math.max(0, minY - h), w, h);

  // label text
  ctx.fillStyle = "#fff";
  ctx.fillText(label, minX + 5, Math.max(12, minY - 4));
  ctx.restore();
}
