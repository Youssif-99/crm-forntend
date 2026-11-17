import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiServerUrl = process.env.API_SERVER_URL ??
      (process.env.VERCEL === "1" ? undefined : "http://localhost:4000");
    if (!apiServerUrl) throw new Error("Set API_SERVER_URL to the deployed Express API origin.");
    return [{
      source: "/api/:path*",
      destination: `${apiServerUrl.replace(/\/+$/, "")}/api/:path*`,
    }];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ...(process.env.NODE_ENV === "production"
          ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
          : []),
      ],
    }];
  },
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
