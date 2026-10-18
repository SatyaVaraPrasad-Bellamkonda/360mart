import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  experimental: {
    serverActions: {
      // Pictures are up to 2 MB and store documents up to 5 MB (backend limits);
      // room for multipart overhead. The backend refuses anything above ~6 MB anyway.
      bodySizeLimit: "6mb",
    },
  },
  logging: {
    // Dev logs would print server action arguments (OTP codes, passwords).
    // Backend calls are logged safely by callApi() in lib/backend/client.ts instead.
    serverFunctions: false,
  },
  partialPrefetching: true,
  async redirects() {
    // There's one login for customers and shopkeepers now; keep old links working.
    return [{ source: "/seller/login", destination: "/login", permanent: false }];
  },
  async headers() {
    return [
      {
        // The map library (scripts/vendor-maplibre.mjs): the folder name is its
        // version, so a file never changes and phones can keep it for a year.
        source: "/vendor/maplibre-gl/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
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
