'use client'
import { useState, useEffect, useRef } from 'react'
import translations from '@/lib/translations.json'

const QUICK_SEARCHES = [
    { label: 'Fever', value: 'fever and body aches' },
    { label: 'Headache', value: 'severe headache' },
    { label: 'Cold & Flu', value: 'cold, runny nose, sneezing' },
    { label: 'Cough', value: 'persistent dry cough' },
    { label: 'Stomach Pain', value: 'stomach pain and nausea' },
    { label: 'Body Pain', value: 'muscle and joint pain' },
    { label: 'Insomnia', value: 'difficulty sleeping, insomnia' },
    { label: 'Blood Pressure', value: 'high blood pressure' },
]

export default function MedicalForm({ onAnalyze, isLoading, language = 'en' }) {
    const [symptoms, setSymptoms] = useState('')
    const [age, setAge] = useState('')
    const [gender, setGender] = useState('')
    const [duration, setDuration] = useState('')
    const [allergies, setAllergies] = useState('')
    const [currentMeds, setCurrentMeds] = useState('')
    const [pregnant, setPregnant] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [isSupported, setIsSupported] = useState(false)

    // Voice Recognition Setup
    const recognitionRef = useRef(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            setIsSupported(true)
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = false
            recognitionRef.current.interimResults = false
            recognitionRef.current.lang = language === 'ur' ? 'ur-PK' : 'en-US'

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript
                setSymptoms(prev => prev ? `${prev} ${transcript}` : transcript)
                setIsListening(false)
            }

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error)
                setIsListening(false)
            }

            recognitionRef.current.onend = () => {
                setIsListening(false)
            }
        }
    }, [language])

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop()
        } else {
            setSymptoms('') // Clear previous text/symptoms when starting fresh voice input
            setIsListening(true)
            recognitionRef.current?.start()
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!symptoms.trim()) return
        onAnalyze({ symptoms, age, gender, duration, allergies, currentMeds, pregnant })
    }

    const t = translations[language] || translations['en']

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '2rem',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            maxWidth: '800px',
            margin: '0 auto 1rem',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {/* Quick Search Chips */}
            <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {t?.quickSearch || 'Quick Search'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {QUICK_SEARCHES.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => setSymptoms(item.value)}
                            disabled={isLoading}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#ccc',
                                padding: '0.45rem 0.9rem',
                                borderRadius: '50px',
                                fontSize: '0.82rem',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Main Input + Mic */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ color: '#aaa', fontSize: '0.85rem', fontWeight: '500' }}>
                            {t?.describeSymptoms || 'Describe your symptoms or condition'}
                        </label>
                        {isSupported && (
                            <button
                                type="button"
                                onClick={toggleListening}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: isListening ? '#ff4b2b' : '#00f260',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                }}
                            >
                                {isListening ? '🔴 Listening...' : '🎙️ Voice Input'}
                            </button>
                        )}
                    </div>
                    <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder={t?.placeholder || "e.g. I have a headache, fever, and sore throat..."}
                        rows={4}
                        style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: `1px solid ${isListening ? '#00f260' : 'rgba(255, 255, 255, 0.08)'}`,
                            padding: '1rem',
                            borderRadius: '12px',
                            color: 'white',
                            outline: 'none',
                            resize: 'vertical',
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            transition: 'border-color 0.2s'
                        }}
                    />
                </div>

                {/* Additional Triage Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="Duration (e.g. 2 days)"
                        style={inputStyle}
                    />
                    <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Age (Optional)"
                        style={inputStyle}
                    />
                    <input
                        type="text"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Allergies (e.g. Penicillin)"
                        style={inputStyle}
                    />
                    <input
                        type="text"
                        value={currentMeds}
                        onChange={(e) => setCurrentMeds(e.target.value)}
                        placeholder="Current Meds"
                        style={inputStyle}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                    >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ccc', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={pregnant}
                            onChange={(e) => setPregnant(e.target.checked)}
                            style={{ accentColor: '#00f260', width: '16px', height: '16px' }}
                        />
                        Pregnant / Nursing
                    </label>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading || !symptoms.trim()}
                    style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: isLoading || !symptoms.trim()
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                        color: isLoading || !symptoms.trim() ? '#666' : 'white',
                        fontWeight: '700',
                        fontSize: '1rem',
                        cursor: isLoading || !symptoms.trim() ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s var(--ease-out)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem'
                    }}
                >
                    {isLoading ? 'Analyzing...' : t?.analyzeButton || '🔍 Find Medicines'}
                </button>
            </form>
        </div>
    )
}

const inputStyle = {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '0.8rem',
    borderRadius: '10px',
    color: 'white',
    outline: 'none',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box'
}
