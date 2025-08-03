import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'build',
  trailingSlash: true,
  experimental: {
    ppr: false,
    dynamicIO: false,
  },
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config: any) => {
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "connect-src 'self' wss://*.supabase.co https://*.supabase.co ws://localhost:* https://localhost:*"
          }
        ]
      }
    ]
  },
  serverExternalPackages: ['@supabase/supabase-js']
};

export default nextConfig;
