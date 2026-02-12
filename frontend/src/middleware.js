import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

let ratelimit = null

// Initialize Upstash if configured
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_URL !== 'your_upstash_redis_rest_url') {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    // Create a new ratelimiter, that allows 20 requests per day per IP
    ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(20, '1 d'),
    })
}

export async function middleware(request) {
    // Only rate limit API routes
    if (!request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.next()
    }

    // Skip rate limiting if not configured (Graceful Fallback)
    if (!ratelimit) {
        return NextResponse.next()
    }

    // Use IP as identifier
    const ip = request.ip || '127.0.0.1'

    // Check limit
    const { success, limit, reset, remaining } = await ratelimit.limit(ip)

    if (!success) {
        return new NextResponse('Daily Rate Limit Exceeded. Please upgrade to Pro.', {
            status: 429,
            headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
            },
        })
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}
