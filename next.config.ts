import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * This machine's own IPv4 addresses (e.g. 192.168.x.x). `next dev` blocks its
 * dev resources for any origin but localhost, so opening the app by LAN IP
 * (another device, or the "Network:" URL) would never hydrate.
 */
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a!.address);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root so a lockfile in a parent directory isn't picked up.
  turbopack: { root: process.cwd() },
  allowedDevOrigins: lanAddresses,
};

export default nextConfig;
