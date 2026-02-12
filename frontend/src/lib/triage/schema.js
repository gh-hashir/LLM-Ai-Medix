import { z } from 'zod'

/**
 * Zod schema for triage output validation
 * Ensures structured, reliable AI responses
 */

export const CitationSchema = z.object({
    title: z.string().default('Unknown Source'),
    url: z.string().default(''),
    quote: z.string().default('')
})

export const TriageResultSchema = z.object({
    urgency: z.enum(['EMERGENCY', 'URGENT', 'ROUTINE', 'SELF_CARE']),
    redFlags: z.array(z.string()).default([]),
    summary: z.string().min(1, 'Summary is required'),
    nextSteps: z.array(z.string()).default([]),
    questions: z.array(z.string()).default([]),
    citations: z.array(CitationSchema).default([])
})

export const DiagnoseResultSchema = z.object({
    medicines: z.array(z.object({
        name: z.string(),
        formula: z.string().describe("Chemical structure (e.g., C13H18O2) NOT name").default('N/A'),
        brands: z.array(z.string()).default([]),
        dosage: z.string().default('Consult a doctor'),
        usage: z.string().default(''),
        type: z.string().default('OTC'),
        warning: z.string().default('Consult healthcare professional before use')
    })).default([]),
    general_advice: z.string().default('Please consult a healthcare professional.'),
    see_doctor: z.boolean().default(true),
    safety_notes: z.array(z.string()).default([])
})

/**
 * Attempt to parse and validate against a Zod schema
 * Returns { success, data, error }
 */
export function validateWithSchema(schema, data) {
    try {
        const result = schema.safeParse(data)
        if (result.success) {
            return { success: true, data: result.data, error: null }
        }
        return { success: false, data: null, error: result.error.format() }
    } catch (err) {
        return { success: false, data: null, error: err.message }
    }
}
