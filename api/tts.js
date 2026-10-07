// Spitch text-to-speech proxy: native Nigerian voices for every language.
// Set SPITCH_API_KEY in Vercel project settings.
import Spitch from "spitch";

const VOICE = { en: "lucy", pcm: "tega", ha: "amina", yo: "sade", ig: "ngozi" };
const LANG = { en: "en", ha: "ha", yo: "yo", ig: "ig" }; // pcm: voice implies it

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.SPITCH_API_KEY) return res.status(500).json({ error: "SPITCH_API_KEY not configured" });
  try {
    const { text, lang } = req.body || {};
    if (!text || !VOICE[lang]) return res.status(400).json({ error: "Bad request" });
    const client = new Spitch({ apiKey: process.env.SPITCH_API_KEY });
    const params = { text: String(text).slice(0, 2000), voice: VOICE[lang], format: "mp3" };
    if (LANG[lang]) params.language = LANG[lang];
    const r = await client.speech.generate(params);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).json({ error: "TTS failed", detail: String(e && e.message || e).slice(0, 200) });
  }
}
