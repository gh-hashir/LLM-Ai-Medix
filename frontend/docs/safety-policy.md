# AI Medix Safety Policy

## 1. Zero-Trust Architecture
We allow **zero** unvalidated outputs from LLMs. Every response passes through:
1. **Pre-Computation Guardrails**: Regex-based blocking of dangerous inputs (e.g., suicide, overdose).
2. **Post-Computation Filtering**: Removal of dangerous keywords (e.g., "antibiotics", "morphine").
3. **Structured Validation**: Strict Zod schema enforcement.

## 2. Hard Rules (Non-LLM)
Before invoking any AI, we check for:
- **Pregnancy**: If `pregnant=true`, ALL medicine suggestions are blocked.
- **Pediatric**: If `age < 12`, output is flagged for pediatric review.
- **Emergency Keywords**: "Chest pain", "Shortness of breath", "Unconscious" trigger immediate `EMERGENCY` urgency.

## 3. Provider Waterfall
To ensure reliability:
1. **Groq (Llama 3.3 70B)**: Fast, accurate.
2. **SambaNova (Llama 3.1 405B)**: Deep reasoning fallback.
3. **Gemini 1.5 Flash**: Google ecosystem fallback.
4. **Demo Engine**: Static safe responses if all AI fails.

## 4. Citation Requirement
To combat hallucinations, the Triage engine is instructed to:
- Cite sources from the RAG context.
- If no RAG context is available, stick to general knowledge and cite "General Medical Consensus".
