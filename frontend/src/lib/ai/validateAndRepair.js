import Groq from 'groq-sdk'
import { validateWithSchema } from '../triage/schema.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

/**
 * Extract JSON from LLM response text (handles markdown wrapping, truncation, etc.)
 */
function extractJSON(text) {
    if (!text) return null

    let processed = text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')

    // Try direct parse
    try { return JSON.parse(processed) } catch (e) { }

    // Find first { and try to parse from there
    const start = processed.indexOf('{')
    if (start === -1) return null

    let segment = processed.substring(start)

    // Structural repair
    let inStr = false, esc = false, braces = 0, brackets = 0
    for (let i = 0; i < segment.length; i++) {
        const c = segment[i]
        if (inStr) {
            if (c === '"' && !esc) inStr = false
            esc = (c === '\\' && !esc)
        } else {
            if (c === '"') inStr = true
            else if (c === '{') braces++
            else if (c === '}') braces--
            else if (c === '[') brackets++
            else if (c === ']') brackets--
        }
    }

    let repaired = segment
    if (inStr) repaired += '"'
    repaired = repaired.replace(/:\s*$/, ': null').replace(/,\s*$/, '')
    repaired += ']'.repeat(Math.max(0, brackets))
    repaired += '}'.repeat(Math.max(0, braces))

    try { return JSON.parse(repaired) } catch (e) { }

    // Final cleanup
    try {
        return JSON.parse(repaired.replace(/,(\s*[\]}])/g, '$1'))
    } catch (e) { }

    return null
}

/**
 * Validate LLM output against a Zod schema, and auto-repair if invalid
 * 
 * Flow:
 * 1. Parse JSON from response text
 * 2. Validate with Zod schema
 * 3. If invalid → send repair prompt to LLM
 * 4. If still invalid → return null (caller should use fallback)
 */
export async function validateAndRepair(responseText, schema, systemPrompt) {
    const startTime = Date.now()

    // Step 1: Extract JSON
    const parsed = extractJSON(responseText)
    if (!parsed) {
        console.warn('[validateAndRepair] Could not extract JSON from response')
        return { data: null, repaired: false, latencyMs: Date.now() - startTime }
    }

    // Step 2: Validate
    const validation = validateWithSchema(schema, parsed)
    if (validation.success) {
        return { data: validation.data, repaired: false, latencyMs: Date.now() - startTime }
    }

    console.warn('[validateAndRepair] Validation failed, attempting repair...', validation.error)

    // Step 3: Repair prompt
    try {
        const repairPrompt = `The following JSON output failed validation. Fix it to match the required schema.

Validation errors: ${JSON.stringify(validation.error)}

Original output:
${JSON.stringify(parsed, null, 2)}

Return ONLY the corrected JSON object. No explanation, no markdown.`

        const repairCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt || 'You are a JSON repair assistant. Output only valid JSON.' },
                { role: 'user', content: repairPrompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 2048,
            response_format: { type: 'json_object' }
        })

        const repairedText = repairCompletion.choices[0]?.message?.content
        const repairedParsed = extractJSON(repairedText)

        if (repairedParsed) {
            const revalidation = validateWithSchema(schema, repairedParsed)
            if (revalidation.success) {
                console.log('[validateAndRepair] Repair succeeded!')
                return { data: revalidation.data, repaired: true, latencyMs: Date.now() - startTime }
            }
        }
    } catch (repairErr) {
        console.error('[validateAndRepair] Repair call failed:', repairErr.message)
    }

    // Step 4: Return failure
    console.error('[validateAndRepair] Repair failed, returning null')
    return { data: null, repaired: false, latencyMs: Date.now() - startTime }
}
