import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  output: "standalone",
  async rewrites() {
    const apiBaseUrl = process.env.HELLOQWEN_API_BASE_URL ?? "http://127.0.0.1:3101";
    const mcpBaseUrl = process.env.HELLOQWEN_MCP_BASE_URL ?? "http://127.0.0.1:3102";
    return [
      {
        source: "/api/mcp",
        destination: `${mcpBaseUrl}/api/mcp`,
      },
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
