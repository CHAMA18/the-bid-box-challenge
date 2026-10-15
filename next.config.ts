import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* Keep the corner clear — the dashboard sidebar lives bottom-left */
  devIndicators: false,
};

export default nextConfig;
