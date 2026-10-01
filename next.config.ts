import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Resume and application uploads may be up to 10 MiB; allow multipart
    // overhead through both the proxy and server actions.
    serverActions: { bodySizeLimit: "11mb" },
    proxyClientMaxBodySize: "11mb",
  },
};

export default nextConfig;
