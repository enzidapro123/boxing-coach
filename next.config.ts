import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Turbopack alias (Next 15)
  experimental: {
    turbo: {
      resolveAlias: {
        "@mediapipe/pose": "./src/app/shims/mediapipe-pose.ts",
      },
    },
  },

  webpack(config) {
    // your @ alias
    config.resolve.alias ||= {};
    config.resolve.alias["@"] = path.resolve(__dirname, "src");

    // Shim @mediapipe/pose (Webpack path)
    config.resolve.alias["@mediapipe/pose"] = path.resolve(
      __dirname,
      "src/app/shims/mediapipe-pose.ts"
    );

    return config;
  },
};

export default nextConfig;
