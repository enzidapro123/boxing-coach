import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve.alias["@"] = __dirname + "/src";
    return config;
  },
};

export default nextConfig;
