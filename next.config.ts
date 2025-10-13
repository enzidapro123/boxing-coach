import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    // 👇 Ensure alias resolves before Turbopack touches the bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      "@mediapipe/pose": path.resolve(
        __dirname,
        "src/app/shims/mediapipe-pose.ts"
      ),
      "@mediapipe/pose/pose": path.resolve(
        __dirname,
        "src/app/shims/mediapipe-pose.ts"
      ),
    };
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: {
        "@mediapipe/pose": "./src/app/shims/mediapipe-pose.ts",
        "@mediapipe/pose/pose": "./src/app/shims/mediapipe-pose.ts",
      },
    },
  },
};

export default nextConfig;
