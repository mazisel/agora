import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
  // CSP temporarily disabled to allow WebSocket connections
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https: wss: ws: wss://*.supabase.co https://*.supabase.co wss://riacmnpxjsbrppzfjeur.supabase.co https://riacmnpxjsbrppzfjeur.supabase.co ws://localhost:* https://localhost:*;"
  //         }
  //       ]
  //     }
  //   ]
  // },
  serverExternalPackages: ['@supabase/supabase-js', 'firebase-admin', 'google-auth-library']
};

export default nextConfig;
