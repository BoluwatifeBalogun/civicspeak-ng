// Spitch text-to-speech proxy: native Nigerian voices (raw HTTP, no SDK,
// so a dependency or bundling issue can never silently kill native voice).
// Set SPITCH_API_KEY in Vercel project settings.
const VOICE = { en: "lucy", pcm: "tega", yo: "sade" };
const LANG = { en: "en", yo: "yo" }; // pcm: the voice itself carries it

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.SPITCH_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "SPITCH_API_KEY not configured" });
  try {
    const { text, lang } = req.body || {};
    if (!text || !VOICE[lang]) return res.status(400).json({ error: "Bad request" });
    const payload = { text: String(text).slice(0, 2000), voice: VOICE[lang], format: "mp3", speed: 1.0 };
    if (LANG[lang]) payload.language = LANG[lang];
    const r = await fetch("https://api.spitch.app/v1/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      let detail = ""; try { detail = (await r.text()).slice(0, 200); } catch {}
      return res.status(502).json({ error: `Spitch TTS ${r.status}`, detail });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).json({ error: "TTS failed", detail: String((e && e.message) || e).slice(0, 200) });
  }
}
