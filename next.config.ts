import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Turbopack resolves CSS bare imports from the workspace root instead of
      // the project root. This alias forces it to find tailwindcss correctly.
      tailwindcss: path.resolve(__dirname, "node_modules/tailwindcss"),
    },
  },
};

export default nextConfig;
