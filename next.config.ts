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
            value: "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https: wss: ws: wss://*.supabase.co https://*.supabase.co ws://localhost:* https://localhost:*;"
          }
        ]
      }
    ]
  },
  serverExternalPackages: ['@supabase/supabase-js']
};

export default nextConfig;
