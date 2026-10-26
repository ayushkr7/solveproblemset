import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root so a lockfile in a parent directory isn't picked up.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
