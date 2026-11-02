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
  turbopack: {
    root: process.cwd(),
    rules: {
      // `import svg from "./file.svg?raw"` yields the markup as a string, so an
      // SVG can be inlined and themed with the page's CSS variables.
      "*.svg": { condition: { query: /[?&]raw(?=&|$)/ }, type: "raw" },
    },
  },
  allowedDevOrigins: lanAddresses,
};

// Initialize Cloudflare bindings for local development.
initOpenNextCloudflareForDev();

export default nextConfig;
