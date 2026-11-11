import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the project root: a stray package-lock.json in a parent folder
    // otherwise makes Turbopack pick the wrong workspace root.
    root: __dirname,
  },
};

export default nextConfig;
