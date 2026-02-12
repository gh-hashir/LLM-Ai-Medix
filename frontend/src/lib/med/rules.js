/**
 * Hard safety rules (non-LLM) for medical guidance
 * These run BEFORE and AFTER the AI to enforce guardrails
 */

const EMERGENCY_PATTERNS = [
    { pattern: /chest\s*pain.*(?:breath|breathing|shortness)/i, reason: 'Chest pain with breathing difficulty — possible cardiac event' },
    { pattern: /(?:shortness|difficulty)\s*(?:of\s*)?breath.*chest/i, reason: 'Breathing difficulty with chest symptoms — possible cardiac event' },
    { pattern: /(?:can'?t|cannot|unable)\s*(?:to\s*)?breathe/i, reason: 'Severe breathing difficulty — requires immediate attention' },
    { pattern: /(?:stroke|paralysis|can'?t\s*move\s*(?:arm|leg|face))/i, reason: 'Possible stroke symptoms — FAST protocol applies' },
    { pattern: /(?:seizure|convulsion|fitting)/i, reason: 'Seizure activity — requires emergency evaluation' },
    { pattern: /(?:unconscious|passed\s*out|not\s*responsive)/i, reason: 'Loss of consciousness — requires emergency care' },
    { pattern: /(?:severe|heavy|uncontrolled)\s*bleeding/i, reason: 'Severe bleeding — requires immediate medical intervention' },
    { pattern: /(?:anaphyl|throat\s*(?:closing|swelling).*allerg)/i, reason: 'Possible anaphylaxis — use EpiPen if available, call emergency' },
    { pattern: /(?:suicid|self.?harm|want\s*to\s*die)/i, reason: 'Mental health emergency — contact crisis helpline immediately' },
    { pattern: /(?:poison|overdose|swallowed\s*(?:chemical|bleach|pills))/i, reason: 'Possible poisoning/overdose — call poison control immediately' },
]

const BANNED_SUGGESTIONS = [
    /antibiotic/i,
    /opioid/i,
    /morphine/i,
    /codeine/i,
    /tramadol/i,
    /benzodiazepine/i,
    /steroid(?!.*cream|.*ointment)/i,
    /insulin/i,
    /chemotherapy/i,
]

/**
 * Pre-LLM safety check: runs BEFORE calling the AI
 * Returns { blocked, urgency, reason, advice } or null if safe to proceed
 */
export function preCheckSafety({ symptoms, age, pregnant, allergies }) {
    const results = { blocked: false, emergencyDetected: false, warnings: [], safetyNotes: [] }

    // Check for emergency patterns
    for (const { pattern, reason } of EMERGENCY_PATTERNS) {
        if (pattern.test(symptoms)) {
            results.emergencyDetected = true
            results.warnings.push(reason)
        }
    }

    // Pregnancy check
    if (pregnant) {
        results.safetyNotes.push('Patient is pregnant — no medication suggestions will be provided. Please consult your OB/GYN or healthcare provider.')
        results.blocked = true
    }

    // Age checks
    const numAge = parseInt(age)
    if (numAge && numAge < 2) {
        results.safetyNotes.push('Patient is an infant (<2 years) — no OTC medication suggestions. Consult a pediatrician immediately.')
        results.blocked = true
    } else if (numAge && numAge < 12) {
        results.safetyNotes.push('Patient is a child — dosages must be pediatric-appropriate. Consult a pediatrician.')
    } else if (numAge && numAge > 65) {
        results.safetyNotes.push('Patient is elderly — drug interactions and kidney/liver function should be considered.')
    }

    return results
}

/**
 * Post-LLM filter: removes banned medication suggestions from AI output
 */
export function postFilterMedicines(medicines = []) {
    return medicines.filter(med => {
        const nameAndFormula = `${med.name} ${med.formula} ${med.usage || ''}`
        return !BANNED_SUGGESTIONS.some(regex => regex.test(nameAndFormula))
    }).map(med => ({
        ...med,
        warning: med.warning || 'Consult a healthcare professional before use. This is general OTC guidance only.',
        type: 'OTC Guidance'
    }))
}

/**
 * Check if symptoms indicate insufficient info for medicine suggestions
 */
export function needsMoreInfo(symptoms) {
    if (!symptoms || symptoms.trim().length < 10) {
        return { needsMore: true, reason: 'Please provide more detail about your symptoms for accurate guidance.' }
    }
    // Very vague symptoms
    const vaguePatterns = [/^(?:i\s*)?(?:feel|am)\s*(?:bad|sick|ill|unwell)$/i, /^(?:help|medicine|drug)$/i]
    for (const p of vaguePatterns) {
        if (p.test(symptoms.trim())) {
            return { needsMore: true, reason: 'Your description is too general. Please describe specific symptoms (e.g., "headache with fever for 2 days").' }
        }
    }
    return { needsMore: false }
}
