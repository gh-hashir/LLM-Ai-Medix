'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Background from '@/components/Background'
import Navbar from '@/components/Navbar'
import MedicalForm from '@/components/MedicalForm'
import DiagnosisResults from '@/components/DiagnosisResults'
import Loading from '@/components/Loading'
import Footer from '@/components/Footer'
import EmergencyPanel from '@/components/EmergencyPanel'

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [triageResult, setTriageResult] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)
  const [language, setLanguage] = useState('en')

  const handleAnalyze = async (formData) => {
    if (!session) {
      router.push('/login?mode=signup')
      return
    }

    setIsLoading(true)
    setResult(null)
    setTriageResult(null)
    setErrorDetails(null)

    try {
      // Step 1: Call Triage API
      const triageRes = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const triageData = await triageRes.json()

      if (triageData.error) throw new Error(triageData.error)

      setTriageResult(triageData)

      // Immediate redirect for Emergency
      if (triageData.urgency === 'EMERGENCY') {
        setIsLoading(false)
        return // Stop workflow, show emergency banner
      }

      // Step 2: Call Diagnosis API (only if safe)
      const diagRes = await fetch('/api/med/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const diagData = await diagRes.json()

      if (diagData.error) {
        // If diagnosis fails but triage worked, just show triage
        console.warn('Diagnosis failed:', diagData.error)
      } else {
        setResult(diagData)
      }

    } catch (error) {
      console.error('AI Medix error:', error)
      setErrorDetails({ message: error.message || 'An unexpected error occurred.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Language Toggle Handler
  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'ur' : 'en')

  return (
    <>
      <Background />
      <Navbar />

      <div style={{ position: 'absolute', top: '100px', right: '2rem', zIndex: 50 }}>
        <button
          onClick={toggleLanguage}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            cursor: 'pointer'
          }}
        >
          {language === 'en' ? '🇺🇸 English' : '🇵🇰 اردو'}
        </button>
      </div>

      <main className="main">
        {/* Triage Banner (Emergency/Urgent) */}
        {triageResult && triageResult.urgency === 'EMERGENCY' && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '2px solid #ff0000',
            padding: '2rem',
            margin: '2rem auto',
            maxWidth: '800px',
            borderRadius: '16px',
            textAlign: 'center',
            animation: 'pulse 1.5s infinite'
          }}>
            <h2 style={{ color: '#ff4b2b', fontSize: '2rem' }}>⚠️ EMERGENCY DETECTED</h2>
            <p style={{ color: 'white', fontSize: '1.2rem', margin: '1rem 0' }}>{triageResult.summary}</p>
            <Link href="/emergency" style={{
              background: '#ff0000', color: 'white', padding: '1rem 2rem',
              borderRadius: '50px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block'
            }}>
              🚑 CONTACT EMERGENCY SERVICES NOW
            </Link>
          </div>
        )}

        {/* Hero Section */}
        <section style={{ paddingTop: '6rem', textAlign: 'center', paddingBottom: '2rem', width: '100%' }}>
          <div style={{ position: 'relative', zIndex: 10, maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem' }}>
            <h1 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: 1.1, marginBottom: '1.5rem' }}>
              <span className="gradient-text">AI Medix</span>
            </h1>
            <p style={{ fontSize: '1.15rem', color: '#aaa', maxWidth: '550px', margin: '0 auto' }}>
              {language === 'en'
                ? 'Advanced Medical Triage & Medicine Finder'
                : 'جدید طبی ٹریج اور ادویات تلاش کرنے والا'}
            </p>
          </div>
        </section>

        <MedicalForm onAnalyze={handleAnalyze} isLoading={isLoading} language={language} />

        {errorDetails && (
          <div style={{ maxWidth: '750px', margin: '2rem auto', padding: '1.5rem', border: '1px solid red', color: 'red', borderRadius: '12px' }}>
            <h3>Error</h3>
            <p>{errorDetails.message}</p>
          </div>
        )}

        <Loading isVisible={isLoading} message={language === 'en' ? "Analyzing symptoms..." : "علامات کا تجزیہ کر رہا ہے..."} />

        {/* Triage Results (Non-Emergency) */}
        {triageResult && triageResult.urgency !== 'EMERGENCY' && (
          <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#00f260' }}>🩺 Triage Assessment</h3>
              <span style={{
                padding: '0.4rem 1rem', borderRadius: '20px',
                background: triageResult.urgency === 'URGENT' ? 'orange' : 'green',
                color: 'black', fontWeight: 'bold'
              }}>
                {triageResult.urgency}
              </span>
            </div>
            <p style={{ color: 'white', lineHeight: '1.6' }}>{triageResult.summary}</p>

            {triageResult.citations && triageResult.citations.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <small style={{ color: '#888' }}>Sources:</small>
                {triageResult.citations.map((cite, i) => (
                  <div key={i}><a href={cite.url} target="_blank" style={{ color: '#00f260', fontSize: '0.8rem' }}>{cite.title}</a></div>
                ))}
              </div>
            )}
          </div>
        )}

        <DiagnosisResults result={result} />

        <Footer />

        <style jsx global>{`
           @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4); }
              70% { box-shadow: 0 0 0 20px rgba(255, 0, 0, 0); }
              100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
           }
        `}</style>
      </main>
      <EmergencyPanel />
    </>
  )
}
