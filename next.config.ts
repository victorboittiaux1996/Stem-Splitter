import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    middlewareClientMaxBodySize: "50mb",
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
