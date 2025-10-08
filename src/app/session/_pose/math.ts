import type { Keypoint } from "@tensorflow-models/pose-detection";

type XY = { x: number; y: number };

export function getPoint(keypoints: Keypoint[], name: string): XY | null {
  const kp = keypoints.find((k) => k.name === name || (k as any).part === name);
  return kp ? { x: kp.x, y: kp.y } : null;
}

function angle(a: XY, b: XY, c: XY) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag1 = Math.hypot(ab.x, ab.y);
  const mag2 = Math.hypot(cb.x, cb.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function elbowAngleRight(keypoints: Keypoint[]) {
  const shoulder = getPoint(keypoints, "right_shoulder");
  const elbow = getPoint(keypoints, "right_elbow");
  const wrist = getPoint(keypoints, "right_wrist");
  if (!shoulder || !elbow || !wrist) return null;
  return angle(shoulder, elbow, wrist);
}

/**
 * Very simple “jab” rep detection:
 * - counts a rep when the right wrist extends forward past the right shoulder
 * - then returns when it comes back (to avoid multiple counts)
 */
export class JabCounter {
  private extended = false;
  public reps = 0;

  update(keypoints: Keypoint[]) {
    const shoulder = getPoint(keypoints, "right_shoulder");
    const wrist = getPoint(keypoints, "right_wrist");
    if (!shoulder || !wrist) return this.reps;

    // Smaller x means more to the left; on typical webcams, punching “forward”
    // is approximately wrist.x < shoulder.x by a margin (tune threshold)
    const forward = wrist.x < shoulder.x - 20;

    if (forward && !this.extended) {
      this.extended = true;
    }
    // Reset when the wrist returns “behind” the shoulder
    if (!forward && this.extended) {
      this.reps += 1;
      this.extended = false;
    }
    return this.reps;
  }
}
