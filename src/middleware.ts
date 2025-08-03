import { NextRequest, NextResponse } from 'next/server';

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Security headers
const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer-when-downgrade',
  'Content-Security-Policy': "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https: wss: ws: wss://*.supabase.co https://*.supabase.co wss://riacmnpxjsbrppzfjeur.supabase.co https://riacmnpxjsbrppzfjeur.supabase.co ws://localhost:* https://localhost:*;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1';
    const limit = request.nextUrl.pathname.includes('/login') ? 5 : 20; // 5 for login, 20 for other APIs
    const windowMs = 60 * 1000; // 1 minute

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, {
        count: 0,
        lastReset: Date.now(),
      });
    }

    const ipData = rateLimitMap.get(ip)!;

    // Reset counter if window has passed
    if (Date.now() - ipData.lastReset > windowMs) {
      ipData.count = 0;
      ipData.lastReset = Date.now();
    }

    // Check if limit exceeded
    if (ipData.count >= limit) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((windowMs - (Date.now() - ipData.lastReset)) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((windowMs - (Date.now() - ipData.lastReset)) / 1000).toString(),
            ...securityHeaders
          }
        }
      );
    }

    ipData.count += 1;
  }

  // Clean up old entries (every 100 requests)
  if (Math.random() < 0.01) {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now - data.lastReset > 60 * 1000) {
        rateLimitMap.delete(ip);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
