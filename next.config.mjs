import { networkInterfaces } from "node:os";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/**
 * This machine's own IPv4 addresses.
 */
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a.address);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  allowedDevOrigins: lanAddresses,
};

// Initialize Cloudflare bindings for local development.
initOpenNextCloudflareForDev();

export default nextConfig;
