/**
 * Ingestion Script for RAG
 * Run with: node scripts/ingest.js
 * 
 * Scrapes medical sources, chunks them, embeds them, and stores in Supabase
 */
const { createClient } = require('@supabase/supabase-js')
// const cheerio = require('cheerio') // Uncomment if real scraping is needed (using hardcoded for hackathon speed)
// const { GoogleGenerativeAI } = require('@google/generative-ai') // For embeddings

// --- CONFIG ---
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

const SAMPLE_DOCS = [
    {
        title: "WHO: Headache Management",
        url: "https://who.int/news-room/fact-sheets/detail/headache-disorders",
        content: "Headache disorders are among the most common disorders of the nervous system. Treatment of tension-type headache include aspirin, paracetamol, and ibuprofen."
    },
    {
        title: "NHS: Fever in Adults",
        url: "https://www.nhs.uk/conditions/fever-in-adults/",
        content: "A fever is usually when your body temperature is 38C or higher. Drink plenty of fluids and look out for signs of dehydration. Paracetamol or ibuprofen can help."
    },
    {
        title: "MedlinePlus: Common Cold",
        url: "https://medlineplus.gov/commoncold.html",
        content: "There is no cure for the common cold. Symptoms include sore throat, runny nose, coughing, and sneezing. Over-the-counter medicines may help relieve symptoms."
    }
]

async function ingest() {
    console.log('>>> Starting RAG Ingestion...')

    if (!SUPABASE_URL || SUPABASE_URL === 'your_supabase_project_url') {
        console.error('!!! Supabase not configured. Skipping ingestion.')
        return
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    console.log(`>>> Found ${SAMPLE_DOCS.length} documents to ingest...`)

    // NOTE: For the hackathon demo without requiring a real embedding Service Account,
    // we will store these as text-only or assume headers are passed.
    // In a real prod environment, you would call embedding API here.

    // For this implementation, we will mock the embedding vector insertion
    // assuming the table `rag_documents` exists.

    /*
    const { error } = await supabase.from('rag_documents').insert(
        SAMPLE_DOCS.map(doc => ({
            title: doc.title,
            url: doc.url,
            chunk: doc.content,
            // embedding: [0.1, 0.2, ...] // vector
        }))
    )
    */

    console.log('>>> MOCK Ingestion Complete! (Uncomment Supabase calls with real keys)')
}

ingest()
