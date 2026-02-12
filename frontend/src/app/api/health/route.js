import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Returns provider availability, build info, and uptime
 */

const startTime = Date.now()

export async function GET() {
    const providers = {}

    // Check Groq
    providers.groq = {
        configured: !!process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile'
    }

    // Check Gemini
    providers.gemini = {
        configured: !!process.env.GEMINI_API_KEY,
        model: 'gemini-1.5-flash'
    }

    // Check SambaNova
    providers.sambanova = {
        configured: !!(process.env.SAMBANOVA_API_KEY && process.env.SAMBANOVA_API_KEY !== 'your_sambanova_api_key_here'),
        model: 'Meta-Llama-3.1-405B-Instruct'
    }

    // Check Supabase (RAG)
    const ragAvailable = !!(process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your_supabase_project_url')

    // Check Upstash (Rate Limiting)
    const rateLimitAvailable = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_URL !== 'your_upstash_redis_rest_url')

    const activeProviders = Object.entries(providers).filter(([, v]) => v.configured).length

    return NextResponse.json({
        status: activeProviders > 0 ? 'healthy' : 'degraded',
        uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        providers,
        features: {
            triage: true,
            rag: ragAvailable,
            rateLimit: rateLimitAvailable,
            voice: true,
            urdu: true
        },
        activeProviderCount: activeProviders,
        fallbackOrder: ['Groq', 'SambaNova', 'Gemini', 'Demo']
    })
}
