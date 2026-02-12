import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { TriageResultSchema } from '@/lib/triage/schema'
import { TRIAGE_SYSTEM_PROMPT, buildTriageUserPrompt } from '@/lib/triage/triagePrompt'
import { validateAndRepair } from '@/lib/ai/validateAndRepair'
import { preCheckSafety } from '@/lib/med/rules'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
const GROQ_MODEL = 'llama-3.3-70b-versatile'

/**
 * POST /api/triage
 * Multi-step triage pipeline:
 *   1. Pre-check safety rules (non-LLM)
 *   2. Build prompt with patient data
 *   3. Call LLM with structured output
 *   4. Validate + auto-repair with Zod
 *   5. Return structured triage result
 */
export async function POST(request) {
    const startTime = Date.now()
    try {
        const body = await request.json()
        const { symptoms, age, gender, duration, allergies, currentMeds, pregnant } = body

        if (!symptoms || symptoms.trim().length < 3) {
            return NextResponse.json({ error: 'Please describe your symptoms' }, { status: 400 })
        }

        // Step 1: Pre-check safety (hard rules, no LLM)
        const safetyCheck = preCheckSafety({ symptoms, age, pregnant, allergies })

        // If emergency detected by rules alone, return immediately
        if (safetyCheck.emergencyDetected) {
            return NextResponse.json({
                urgency: 'EMERGENCY',
                redFlags: safetyCheck.warnings,
                summary: 'Emergency symptoms detected. Please seek immediate medical attention or call emergency services.',
                nextSteps: [
                    'Call emergency services (1122 / 115) immediately',
                    'Do not drive yourself — have someone take you or wait for ambulance',
                    'If available, use any prescribed emergency medication (e.g., EpiPen, nitroglycerin)'
                ],
                questions: [],
                citations: [
                    { title: 'WHO Emergency Care', url: 'https://www.who.int/emergencies', quote: 'Seek immediate medical attention for life-threatening symptoms.' }
                ],
                safetyNotes: safetyCheck.safetyNotes,
                provider: 'SafetyRules',
                latencyMs: Date.now() - startTime
            })
        }

        // Step 2: Build prompt
        const userPrompt = buildTriageUserPrompt({ symptoms, age, gender, duration, allergies, currentMeds, pregnant })

        // Step 3: Call Groq LLM
        let responseText = ''
        let provider = 'Groq'

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                model: GROQ_MODEL,
                temperature: 0.3,
                max_tokens: 2048,
                response_format: { type: 'json_object' }
            })
            responseText = completion.choices[0]?.message?.content || ''
        } catch (groqErr) {
            console.error('[Triage] Groq failed:', groqErr.message)

            // Fallback: try Gemini
            try {
                const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `${TRIAGE_SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
                            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
                        })
                    }
                )
                const geminiData = await geminiRes.json()
                responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
                provider = 'Gemini'
            } catch (geminiErr) {
                console.error('[Triage] Gemini also failed:', geminiErr.message)
                // Return demo triage
                return NextResponse.json({
                    urgency: 'ROUTINE',
                    redFlags: [],
                    summary: 'Unable to reach AI services. Based on general guidance, please monitor your symptoms.',
                    nextSteps: ['Visit a healthcare provider if symptoms persist beyond 48 hours', 'Stay hydrated and rest'],
                    questions: ['How long have you experienced these symptoms?', 'Do you have any chronic conditions?'],
                    citations: [{ title: 'WHO General Health', url: 'https://www.who.int', quote: 'Seek medical advice if symptoms persist.' }],
                    safetyNotes: safetyCheck.safetyNotes,
                    provider: 'Demo',
                    latencyMs: Date.now() - startTime
                })
            }
        }

        // Step 4: Validate + auto-repair
        const { data, repaired } = await validateAndRepair(responseText, TriageResultSchema, TRIAGE_SYSTEM_PROMPT)

        if (!data) {
            // All validation failed — return safe default
            return NextResponse.json({
                urgency: 'ROUTINE',
                redFlags: [],
                summary: 'AI analysis completed but output could not be validated. Please consult a healthcare professional.',
                nextSteps: ['Visit a doctor for proper evaluation'],
                questions: [],
                citations: [],
                safetyNotes: safetyCheck.safetyNotes,
                provider: provider + ' (validation failed)',
                latencyMs: Date.now() - startTime
            })
        }

        // Step 5: Return enriched result
        return NextResponse.json({
            ...data,
            safetyNotes: safetyCheck.safetyNotes,
            provider,
            repaired,
            latencyMs: Date.now() - startTime
        })

    } catch (error) {
        console.error('[Triage] Route error:', error)
        return NextResponse.json({ error: 'Triage failed', details: error.message }, { status: 500 })
    }
}
