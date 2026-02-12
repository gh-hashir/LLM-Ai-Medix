import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

let supabase = null
if (supabaseUrl && supabaseUrl !== 'your_supabase_project_url') {
    supabase = createClient(supabaseUrl, supabaseKey)
}

/**
 * Create embedding for query text using Gemini embedding API
 */
async function createEmbedding(text) {
    if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured for embeddings')

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: { parts: [{ text }] }
            })
        }
    )

    if (!response.ok) {
        throw new Error(`Embedding API failed: ${await response.text()}`)
    }

    const data = await response.json()
    return data.embedding.values
}

/**
 * Retrieve top-k relevant document chunks from Supabase pgvector
 * Returns array of { title, url, chunk }
 * 
 * Falls back to empty array if Supabase is not configured
 */
export async function retrieveContext(query, topK = 5) {
    // If Supabase not configured, return empty (graceful degradation)
    if (!supabase) {
        console.log('[RAG] Supabase not configured, skipping retrieval')
        return []
    }

    try {
        const embedding = await createEmbedding(query)

        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: topK
        })

        if (error) {
            console.error('[RAG] Supabase query failed:', error.message)
            return []
        }

        return (data || []).map(doc => ({
            title: doc.title || 'Medical Reference',
            url: doc.url || '',
            chunk: doc.chunk || ''
        }))
    } catch (err) {
        console.error('[RAG] Retrieval failed:', err.message)
        return []
    }
}

/**
 * Format retrieved chunks as context for the LLM prompt
 */
export function formatRAGContext(chunks) {
    if (!chunks || chunks.length === 0) return ''

    const formatted = chunks.map((c, i) =>
        `[Source ${i + 1}: ${c.title}]\n${c.chunk}\nURL: ${c.url}`
    ).join('\n\n')

    return `\n\n--- REFERENCE MEDICAL LITERATURE ---\nUse the following sources to ground your response. Cite them in your citations array.\n\n${formatted}\n--- END REFERENCES ---\n`
}
