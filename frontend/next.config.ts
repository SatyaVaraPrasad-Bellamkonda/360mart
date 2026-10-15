import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  experimental: {
    serverActions: {
      // Profile photos are up to 2 MB (backend limit); room for multipart overhead.
      bodySizeLimit: "3mb",
    },
  },
  logging: {
    // Dev logs would print server action arguments (OTP codes, passwords).
    // Backend calls are logged safely by callApi() in lib/backend/client.ts instead.
    serverFunctions: false,
  },
  partialPrefetching: true,
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
