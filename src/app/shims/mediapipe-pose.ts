// ✅ Dummy shim so Next.js / Turbopack stop failing on @mediapipe/pose imports.
export class Pose {
  close() {}
}
export default Pose;
