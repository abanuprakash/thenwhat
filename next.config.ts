import type { NextConfig } from "next";

// Static security headers. The Content-Security-Policy is set per request in middleware.ts
// because it carries a fresh nonce.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const supabaseUrl = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL.trim()).origin : "";
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // We render plain <img> tags; the image optimiser (and its attack surface) stays off.
  images: { unoptimized: true },
  experimental: {
    // Avatar uploads go through a Server Action (4 MB images plus form overhead).
    serverActions: { bodySizeLimit: "5mb" },
  },
  async rewrites() {
    // Profile photos are served from our own domain, so the browser never sees the storage address.
    return supabaseUrl
      ? [{ source: "/media/avatars/:path*", destination: `${supabaseUrl}/storage/v1/object/public/avatars/:path*` }]
      : [];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Every avatar upload gets a new file name, so a file never changes: cache it for a year.
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
