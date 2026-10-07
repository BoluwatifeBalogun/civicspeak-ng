# CivicSpeak NG - Indigenous Language Chatbot for Public Services

A Retrieval-Augmented Generation (RAG) chatbot giving Nigerian citizens
verified public service information in **English, Nigerian Pidgin, Hausa,
Yoruba and Igbo**, with voice input (speech-to-text) and read-aloud
answers (text-to-speech).

Implementation of the HND seminar project *Indigenous Language Chatbot
for Public Services* (Yaba College of Technology, Dept. of Computer
Science).

## Covered domains

| Domain | Agency |
|---|---|
| NIN enrolment | NIMC |
| International passport | NIS |
| Driver's licence | FRSC |
| Birth registration | NPC |

## Architecture

- **Retrieval**: TF-IDF cosine similarity over a bilingual+ knowledge base,
  with multilingual stopword filtering, a domain-anchor out-of-scope gate,
  and edit-distance typo repair. Stands in for Supabase pgvector in the
  full design.
- **Generation**: LLM answers grounded strictly in retrieved sources
  (Groq-hosted GPT-OSS 120B in this build (model configurable via GROQ_MODEL); the production design targets
  the Gemini API - the prompt contract is identical).
- **Voice**: native Nigerian speech both ways via the Spitch API - tap-to-talk
  recording transcribed in Hausa, Yoruba, Igbo, English and Pidgin, and
  answers read aloud by native voices (Amina, Sade, Ngozi, Lucy, Tega).
  The browser's Web Speech API remains as automatic fallback when no
  Spitch key is configured.
- **Out-of-scope safety**: queries outside the four domains return a clear
  fallback message instead of a generated guess (report test case TC-03).

## Run locally

```bash
npm install
cp .env.example .env   # then put your Groq API key in .env (free at console.groq.com)
npm run dev
```

Open the printed localhost URL in Chrome (best Web Speech API support).

In local dev the app calls the API directly with your `.env` key. In
production it calls `/api/chat`, a serverless function that keeps the
key server-side - never expose the key in client code.

## Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com), click **Add New > Project** and
   import the repo. Vite is auto-detected; keep the defaults.
3. Under **Environment Variables**, add `GROQ_API_KEY` (generation) and `SPITCH_API_KEY` (native Nigerian voice, from spitch.app) with your keys
   (no `VITE_` prefix - this one stays on the server).
4. Deploy. Your app gets an HTTPS URL, which is also what enables
   microphone access for the voice features.

## Test cases

Retrieval verified 25/25 against the report's Table 3.8 cases plus
multilingual and adversarial scenarios, including:

- TC-01: NIN fee query returns the correct grounded entry
- TC-02: the same query in Hausa returns the Hausa entry
- TC-03: "How do I open a bank account?" triggers the fallback
- Typos ("passprt"), mixed English-Pidgin, and full Yoruba diacritics

## Roadmap to the full report design

- Supabase (pgvector) knowledge base with semantic embeddings
- Gemini API generation layer
- Firecrawl weekly content refresh + content health monitoring
- BLEU/ROUGE and SUS evaluation with pilot users
- Cloud ASR/TTS with native Hausa, Yoruba and Igbo voices

## License

Academic project. Knowledge base content is sample data - verify all fees
and procedures on the official agency portals.
