import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local placeholder imagery is served as SVG; allow it to pass through
    // the image pipeline. Swap in real photography + a remote loader for
    // production and this can be tightened back down.
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // Belt-and-suspenders: the admin CMS is also excluded via
        // metadata.robots, robots.ts (disallow), and never linked publicly.
        source: "/leadnest-admin-x7k2/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, nocache" }],
      },
      {
        source: "/api/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
