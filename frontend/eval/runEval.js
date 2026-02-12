import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Simple verification script to run against the running dev server
const BASE_URL = 'http://localhost:3000/api/triage'

async function runEval() {
    console.log('>>> Starting AI Medix Evaluation Harness...')

    // Load cases
    const casesPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cases.json')
    const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'))

    let passed = 0
    let failed = 0

    for (const testCase of cases) {
        console.log(`\nTesting Case ${testCase.id}: ${testCase.description}`)

        try {
            const res = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testCase.input)
            })

            const data = await res.json()

            if (data.urgency === testCase.expectedUrgency) {
                console.log(`✅ PASS: Expected ${testCase.expectedUrgency}, got ${data.urgency}`)
                passed++
            } else {
                console.log(`❌ FAIL: Expected ${testCase.expectedUrgency}, got ${data.urgency}`)
                console.log('Red Flags:', data.redFlags)
                failed++
            }

        } catch (err) {
            console.error('❌ ERROR:', err.message)
            failed++
        }
    }

    console.log(`\n--- EVALUATION SUMMARY ---`)
    console.log(`Total Cases: ${cases.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Pass Rate: ${Math.round((passed / cases.length) * 100)}%`)
}

runEval()
