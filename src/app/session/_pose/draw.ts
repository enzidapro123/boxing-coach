// src/app/session/_pose/draw.ts
import type * as posedetection from "@tensorflow-models/pose-detection";

type KP = posedetection.Keypoint;

// Adjusted threshold for better skeleton visibility
const THRESH = 0.3;

const EDGES: [keyof typeof NAME, keyof typeof NAME][] = [
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
  // Optional: Add neck for better torso (connects shoulders to head)
  ["left_shoulder", "nose"],
  ["right_shoulder", "nose"],
  // TODO: Add face/hands if needed, e.g., ["left_eye", "left_ear"]
];

const NAME = {
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
} as const;

function getKP(kps: KP[], name: keyof typeof NAME): KP | undefined {
  const index = NAME[name];
  const kp = kps[index];
  return visible(kp) ? kp : undefined; // Early filter for consistency
}

function finite(v: number | undefined): boolean {
  return Number.isFinite(v ?? NaN);
}

// Only draw points that (1) have a score and (2) finite x/y
function visible(k?: KP): k is KP {
  return !!k && (k.score ?? 0) >= THRESH && finite(k.x) && finite(k.y);
}

// Fallback: accept all keypoints if none pass threshold
function visibleWithFallback(k: KP | undefined, allKps: KP[]): k is KP {
  if (!k || !finite(k.x) || !finite(k.y)) return false;

  // If score meets threshold, use it
  if ((k.score ?? 0) >= THRESH) return true;

  // Fallback: if no keypoints pass threshold, accept all with finite coordinates
  const validKps = allKps.filter((kp) => finite(kp.x) && finite(kp.y));
  const passingKps = allKps.filter((kp) => (kp.score ?? 0) >= THRESH);

  if (passingKps.length === 0 && validKps.length > 0) {
    return true; // Accept all valid keypoints as fallback
  }

  return false;
}

// ----------------------------- DRAW KEYPOINTS ------------------------------
export function drawKeypoints(ctx: CanvasRenderingContext2D, kps: KP[]) {
  ctx.save();
  for (const k of kps) {
    if (!visibleWithFallback(k, kps)) continue;
    ctx.beginPath();
    // ↑ make dots slightly larger for visibility (was 3 → 4.5)
    ctx.arc(k.x!, k.y!, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 200, 0, 0.95)"; // bright yellow-orange
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------ DRAW SKELETON ------------------------------
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  kps: KP[],
  // Optional: Add param for technique-specific highlighting (e.g., for jab)
  highlightArm?: "left" | "right" | null
) {
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "rgba(0, 200, 255, 0.95)"; // cyan-blue lines (default)
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 3;

  for (const [aName, bName] of EDGES) {
    const a = getKP(kps, aName);
    const b = getKP(kps, bName);
    if (
      !a ||
      !b ||
      !visibleWithFallback(a, kps) ||
      !visibleWithFallback(b, kps)
    )
      continue;

    // Technique highlight: e.g., red for right arm on "jab"
    if (
      highlightArm === "right" &&
      (aName.includes("right") || bName.includes("right"))
    ) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.95)"; // Red for punching arm
    } else if (
      highlightArm === "left" &&
      (aName.includes("left") || bName.includes("left"))
    ) {
      ctx.strokeStyle = "rgba(0, 255, 0, 0.95)"; // Green for left
    } else {
      ctx.strokeStyle = "rgba(0, 200, 255, 0.95)"; // Reset to default
    }

    ctx.beginPath();
    ctx.moveTo(a.x!, a.y!);
    ctx.lineTo(b.x!, b.y!);
    ctx.stroke();
  }

  ctx.restore();
}

// ------------------------- DRAW BOX + CONFIDENCE ---------------------------
export function drawBBoxAndLabel(ctx: CanvasRenderingContext2D, kps: KP[]) {
  const good = kps.filter(visible);
  if (!good.length) return;

  const xs = good.map((k) => k.x!);
  const ys = good.map((k) => k.y!);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);

  const score = good.reduce((s, k) => s + (k.score ?? 0), 0) / good.length;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgb(255, 60, 60)";
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

  const label = `pose ${score.toFixed(2)}`;
  ctx.font = "14px sans-serif";
  const w = ctx.measureText(label).width + 10,
    h = 18;
  ctx.fillStyle = "rgb(255 60 60)";
  ctx.fillRect(minX, Math.max(0, minY - h), w, h);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, minX + 5, Math.max(12, minY - 4));
  ctx.restore();
}
