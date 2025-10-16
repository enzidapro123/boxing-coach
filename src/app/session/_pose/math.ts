import type { Keypoint } from "@tensorflow-models/pose-detection";

type XY = { x: number; y: number };

// Support old PoseNet-style keypoints that had `part`
type KeypointWithPart = Keypoint & { part?: string };

/** Find a point by landmark name, supporting both `name` and legacy `part`. */
export function getPoint(keypoints: Keypoint[], name: string): XY | null {
  const kp = (keypoints as KeypointWithPart[]).find(
    (k) => (k.name ?? k.part) === name
  );
  return kp ? { x: kp.x, y: kp.y } : null;
}

function angle(a: XY, b: XY, c: XY): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag1 = Math.hypot(ab.x, ab.y);
  const mag2 = Math.hypot(cb.x, cb.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function elbowAngleRight(keypoints: Keypoint[]): number | null {
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

  update(keypoints: Keypoint[]): number {
    const shoulder = getPoint(keypoints, "right_shoulder");
    const wrist = getPoint(keypoints, "right_wrist");
    if (!shoulder || !wrist) return this.reps;

    // Smaller x means more to the left; on typical webcams, punching “forward”
    // is approximately wrist.x < shoulder.x by a margin (tune threshold)
    const forward = wrist.x < shoulder.x - 20;

    if (forward && !this.extended) {
      this.extended = true;
    }
    if (!forward && this.extended) {
      this.reps += 1;
      this.extended = false;
    }
    return this.reps;
  }
}
