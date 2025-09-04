interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // Yeni pencere başlat
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true };
    }

    if (record.count >= this.maxRequests) {
      // Limit aşıldı
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // İsteği artır
    record.count++;
    return { allowed: true };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter({
  maxRequests: 200, // 200 istek (daha esnek)
  windowMs: 60 * 1000 // 1 dakika
});

// Cleanup her 5 dakikada bir (sadece browser'da)
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}

export { RateLimiter, globalRateLimiter };

// API route'ları için rate limiting middleware
export async function rateLimit(request: Request): Promise<{ success: boolean; headers?: Record<string, string> }> {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const { allowed, retryAfter } = await globalRateLimiter.checkLimit(ip);
  
  if (!allowed) {
    return {
      success: false,
      headers: {
        'Retry-After': retryAfter?.toString() || '60',
        'X-RateLimit-Limit': globalRateLimiter['maxRequests'].toString(),
        'X-RateLimit-Remaining': '0'
      }
    };
  }
  
  return { success: true };
}

// Rate limit headers oluşturma
export function getRateLimitHeaders(remaining: number = 10): Record<string, string> {
  return {
    'X-RateLimit-Limit': globalRateLimiter['maxRequests'].toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(Date.now() + globalRateLimiter['windowMs']).toISOString()
  };
}

// API çağrıları için yardımcı fonksiyon
export async function rateLimitedFetch(
  url: string, 
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  const userId = 'global'; // Gerçek uygulamada user ID kullanılabilir
  
  for (let attempt = 0; attempt < retries; attempt++) {
    const { allowed, retryAfter } = await globalRateLimiter.checkLimit(userId);
    
    if (!allowed && retryAfter) {
      console.log(`Rate limit aşıldı, ${retryAfter} saniye beklenecek...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Server rate limit, ${retryAfter} saniye beklenecek...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Hata oluştu, ${delay}ms beklenecek...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Rate limit aşıldı, maksimum deneme sayısına ulaşıldı');
}

// Batch API çağrıları için yardımcı
export async function batchFetch(
  requests: Array<{ url: string; options?: RequestInit }>,
  batchSize = 3,
  delayBetweenBatches = 1000
): Promise<Response[]> {
  const results: Response[] = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    
    const batchPromises = batch.map(({ url, options }) => 
      rateLimitedFetch(url, options)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Batch'ler arası bekleme
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}
