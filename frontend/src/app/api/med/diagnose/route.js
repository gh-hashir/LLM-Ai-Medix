import { NextResponse } from 'next/server'
import Groq from "groq-sdk";
import { DiagnoseResultSchema } from '@/lib/triage/schema'
import { validateAndRepair } from '@/lib/ai/validateAndRepair'
import { preCheckSafety, postFilterMedicines } from '@/lib/med/rules'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are AI Medix, a safe medical assistant.
Your goal is to suggest OTC (Over-The-Counter) medicines and general health advice.
NEVER suggest prescription-only drugs, antibiotics, or controlled substances.
ALWAYS advise the user to consult a doctor.

CRITICAL INSTRUCTIONS:
1. Provide at least 4 to 5 distinct medicine options.
2. STRICTLY respect the patient's age.
   - If patient is a CHILD (<12 years): Suggest ONLY pediatric formulations (Syrups, Drops, Chewable). NO tablets/capsules unless specified for kids.
   - Dosage MUST be age-appropriate (e.g., "5ml every 6 hours" for syrup).
   - Do NOT suggest adult dosages for children.

JSON Schema:
{
  "medicines": [
    {
      "name": "Generic Name",
      "formula": "Chemical Structure (e.g., C13H18O2) - NOT the drug name",
      "brands": ["Brand 1", "Brand 2"],
      "dosage": "General adult dosage (e.g., 500mg every 6 hours)",
      "usage": "Indication",
      "type": "OTC",
      "warning": "Key interactions/warnings"
    }
  ],
  "general_advice": "Non-pharmacological advice (diet, rest, etc.)",
  "see_doctor": true,
  "safety_notes": ["Specific safety warnings based on patient data"]
}`

export async function POST(request) {
    const startTime = Date.now()
    try {
        const body = await request.json()
        const { symptoms, age, gender, allergies, currentMeds, pregnant } = body

        if (!symptoms) {
            return NextResponse.json({ error: 'Symptoms required' }, { status: 400 })
        }

        // 1. Pre-Check Safety (Hard Rules)
        const safetyCheck = preCheckSafety({ symptoms, age, pregnant, allergies })

        if (safetyCheck.blocked) {
            return NextResponse.json({
                medicines: [],
                general_advice: "Based on your risk factors (pregnancy, age, or specific symptoms), we cannot provide automated medicine suggestions. Please consult a specialist.",
                see_doctor: true,
                safety_notes: safetyCheck.safetyNotes
            })
        }

        const userPrompt = `Patient: ${age || 'Adult'} ${gender || ''}. History: ${allergies ? 'Allergies: ' + allergies : 'None'}. Current Meds: ${currentMeds || 'None'}.
Symptoms: ${symptoms}

Task: Recommend safe OTC medicines. If symptoms are severe, suggest only "See Doctor".`

        // 2. Call LLM
        let responseText = ''
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt }
                ],
                model: GROQ_MODEL,
                temperature: 0.3,
                max_tokens: 2048,
                response_format: { type: "json_object" }
            });
            responseText = completion.choices[0]?.message?.content || ''
        } catch (err) {
            console.error('Groq Diagnose Failed:', err)
            throw new Error('AI Service Unavailable')
        }

        // 3. Validation + Repair
        const { data, repaired } = await validateAndRepair(responseText, DiagnoseResultSchema, SYSTEM_PROMPT)

        if (!data) {
            throw new Error('Failed to generate valid medical data')
        }

        // 4. Post-Filter (Remove banned keywords like 'antibiotic')
        const safeMedicines = postFilterMedicines(data.medicines)

        return NextResponse.json({
            ...data,
            medicines: safeMedicines,
            safety_notes: [...(data.safety_notes || []), ...safetyCheck.safetyNotes],
            latencyMs: Date.now() - startTime
        })

    } catch (error) {
        console.error('Diagnose Route Error:', error)
        return NextResponse.json({
            error: "Diagnosis Service Failed",
            details: [error.message]
        }, { status: 500 })
    }
}
