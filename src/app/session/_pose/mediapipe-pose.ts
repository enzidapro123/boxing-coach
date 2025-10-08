// Minimal wrapper that always returns a working BlazePose (MediaPipe runtime)
import * as posedetection from "@tensorflow-models/pose-detection";

/**
 * MediaPipe needs to know where to fetch its WASM/assets from.
 * Using the official CDN + a pinned version avoids 404s.
 */
export async function createMediapipeDetector() {
  const model = posedetection.SupportedModels.BlazePose;
  const detector = await posedetection.createDetector(model, {
    runtime: "mediapipe",
    // 👇 pinned version is important
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404",
    modelType: "full",
    enableSmoothing: true,
    enableSegmentation: false,
  });
  return detector;
}
