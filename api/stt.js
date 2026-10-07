// Spitch speech-to-text proxy: native recognition for Nigerian languages.
// Receives WAV audio (base64) recorded client-side via tap-to-talk.
import Spitch, { toFile } from "spitch";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };
const LANG = { en: "en", ha: "ha", yo: "yo", ig: "ig", pcm: "en" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.SPITCH_API_KEY) return res.status(500).json({ error: "SPITCH_API_KEY not configured" });
  try {
    const { audio, lang } = req.body || {};
    if (!audio) return res.status(400).json({ error: "Bad request" });
    const buf = Buffer.from(audio, "base64");
    if (buf.length > 6 * 1024 * 1024) return res.status(413).json({ error: "Audio too large" });
    const client = new Spitch({ apiKey: process.env.SPITCH_API_KEY });
    const file = await toFile(buf, "speech.wav");
    const params = { content: file };
    if (LANG[lang]) params.language = LANG[lang];
    const r = await client.speech.transcribe(params);
    return res.status(200).json({ text: (r && r.text) || "" });
  } catch (e) {
    return res.status(502).json({ error: "STT failed", detail: String(e && e.message || e).slice(0, 200) });
  }
}
