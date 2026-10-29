import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Both are enabled together per the Next 16 docs (see node_modules/next/dist/docs).
  // Every marketing route here is static, so Cache Components only affects the
  // shell/prefetch split; nothing on this site reads request-time data.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
