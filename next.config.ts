import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/api/meetings/transcribe": [
      "./AGENTS.md",
      "./CLAUDE.md",
      "./Dockerfile",
      "./README.md",
      "./docker-compose.yml",
      "./eslint.config.mjs",
      "./models/**/*",
      "./next.config.ts",
      "./src/**/*",
      "./tsconfig.json",
    ],
  },
};

export default nextConfig;
