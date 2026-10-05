import { useState, useRef, useEffect, useMemo } from "react";

/* ============================================================
   INDIGENOUS LANGUAGE CHATBOT FOR PUBLIC SERVICES  ·  v2
   Defense corrections applied:
   - Voice both ways: speech-to-text AND text-to-speech
   - Languages: English, Nigerian Pidgin, Hausa, Yoruba, Igbo
   Retrieval: TF-IDF cosine (pgvector stand-in)
   Generation: Claude API (Gemini stand-in, same prompt contract)
   ============================================================ */

/* ---------- KNOWLEDGE BASE (Table 3.2 schema; sample corpus) ----------
   Production: Supabase pgvector, refreshed weekly via Firecrawl.
   Yoruba/Igbo/Pidgin entries to be reviewed by fluent speakers
   before pilot (section 3.16 risk mitigation). */
const KB = [
  // ---------------- NIN / NIMC ----------------
  { id: "nin-01", domain: "nin", agency: "NIMC", lang: "en",
    q: "How do I enrol for my National Identification Number (NIN)?",
    a: "NIN enrolment is done in person at any NIMC enrolment centre. Bring one valid supporting document such as a birth certificate, declaration of age, voter's card, or passport. Your biometrics (fingerprints and photograph) are captured, and you receive a Transaction Slip. The NIN itself is issued after processing, often the same day.",
    kw: "enrol enrollment register rijista yin nin yadda ake samun lambar shaida nimc cibiyar forukosile iforukosile bawo debanye kedu how i go take",
    src: "https://nimc.gov.ng/nin-enrolment/" },
  { id: "nin-02", domain: "nin", agency: "NIMC", lang: "en",
    q: "How much does NIN enrolment cost?",
    a: "First-time NIN enrolment is free of charge at NIMC centres in Nigeria. You should not pay anyone for first enrolment. Paid services exist only for things like NIN retrieval by USSD (small telecom charge), data modification, or diaspora enrolment.",
    kw: "cost fee price free kudi kyauta nawa ne farashin elo owo ofe ego ole how much e dey cost free",
    src: "https://nimc.gov.ng/" },
  { id: "nin-03", domain: "nin", agency: "NIMC", lang: "en",
    q: "How can I retrieve my NIN if I forgot it?",
    a: "Dial *346# from the phone number you enrolled with and follow the prompts to display your NIN. A small telecom convenience charge applies. You can also use the NIMC mobile app or visit an enrolment centre with your Tracking ID.",
    kw: "retrieve forgot lost check manta ussd *346 duba lambar gbagbe chefuru i don forget",
    src: "https://nimc.gov.ng/mobile-id/" },
  { id: "nin-04", domain: "nin", agency: "NIMC", lang: "en",
    q: "What documents are required for NIN enrolment?",
    a: "Any one of: birth certificate or declaration of age, valid passport, voter's card, driver's licence, or a government staff ID. Children under 16 are enrolled with a parent or guardian present, using the parent's NIN and the child's birth certificate.",
    kw: "documents requirements takardu abin da ake bukata yara children iwe akwukwo wetin dem need",
    src: "https://nimc.gov.ng/requirements/" },
  { id: "nin-05", domain: "nin", agency: "NIMC", lang: "ha",
    q: "Yaya ake yin rijistar NIN?",
    a: "Ana yin rijistar NIN kai tsaye a duk wata cibiyar rijista ta NIMC. Ka tafi da daya daga cikin takardun shaida kamar takardar haihuwa, katin zabe ko fasfo. Za a dauki hoton ka da yatsunka, sannan a ba ka takardar sheda (Transaction Slip). Rijistar farko kyauta ce — kada ka biya kowa.",
    kw: "rijista nin yadda ake nimc kyauta takardu enrolment hausa",
    src: "https://nimc.gov.ng/nin-enrolment/" },
  { id: "nin-06", domain: "nin", agency: "NIMC", lang: "yo",
    q: "Bawo ni mo se le forukosile fun NIN?",
    a: "Iforukosile NIN ni a n se ni ojukoju ni ile-ise iforukosile NIMC eyikeyi. Mu okan ninu awon iwe eri bi iwe eri ibi, kaadi ibo, tabi iwe irinna lo. Won yoo ya aworan re ati ika owo re, won yoo si fun o ni iwe eri (Transaction Slip). Iforukosile akoko jе ofe — ma san owo fun enikeni.",
    kw: "forukosile iforukosile nin bawo ni yoruba nimc ofe iwe eri",
    src: "https://nimc.gov.ng/nin-enrolment/" },
  { id: "nin-07", domain: "nin", agency: "NIMC", lang: "ig",
    q: "Kedu ka m ga-esi debanye aha maka NIN?",
    a: "A na-edebanye aha maka NIN n'onwe gi n'ulo oru ndebanye aha NIMC obula. Buru otu akwukwo ihe ngosi dika akwukwo omumu, kaadi ntuli aka, ma o bu paspotu. A ga-ese foto gi na mkpisi aka gi, nye gi akwukwo ngosi (Transaction Slip). Ndebanye aha nke mbu bu n'efu — akwula onye obula ugwo.",
    kw: "debanye ndebanye aha nin kedu igbo nimc efu akwukwo",
    src: "https://nimc.gov.ng/nin-enrolment/" },
  { id: "nin-08", domain: "nin", agency: "NIMC", lang: "pcm",
    q: "How I go take register my NIN?",
    a: "You go waka go any NIMC enrolment centre with one valid document like birth certificate, voter's card or passport. Dem go snap your face and take your fingerprint, then give you Transaction Slip. First registration na free — no pay anybody money for am.",
    kw: "register nin pidgin how i go take free no pay waka nimc",
    src: "https://nimc.gov.ng/nin-enrolment/" },

  // ---------------- Passport / NIS ----------------
  { id: "pp-01", domain: "passport", agency: "NIS", lang: "en",
    q: "How do I apply for a Nigerian international passport?",
    a: "Apply online at the Nigeria Immigration Service passport portal: create an account, fill the application form, upload your NIN details, pay the official fee online, then book an appointment at a passport office for biometric capture. The enhanced e-passport is issued after processing.",
    kw: "apply application passport fasfo yadda ake neman immigration online portal iwe irinna paspotu bawo kedu how person go take",
    src: "https://passport.immigration.gov.ng/" },
  { id: "pp-02", domain: "passport", agency: "NIS", lang: "en",
    q: "How much does the Nigerian passport cost?",
    a: "As at the last official schedule: the 32-page 5-year booklet costs N50,000 and the 64-page 10-year booklet costs N100,000 for applicants within Nigeria. Diaspora fees are charged in dollars and differ. Always pay only through the official portal and confirm the current fee there before paying.",
    kw: "cost fee price how much nawa kudin fasfo 32 64 page naira elo owo ego ole how much passport dey cost",
    src: "https://immigration.gov.ng/passport-fees/" },
  { id: "pp-03", domain: "passport", agency: "NIS", lang: "en",
    q: "What documents do I need for a first-time passport application?",
    a: "You need your NIN, a birth certificate or age declaration, a local government indigene certificate or evidence of state of origin, and your completed online application with payment receipt. Minors additionally need parents' consent and the parents' data page.",
    kw: "documents requirements first time takardu abin da ake bukata fasfo iwe akwukwo wetin dem need",
    src: "https://immigration.gov.ng/" },
  { id: "pp-04", domain: "passport", agency: "NIS", lang: "en",
    q: "How long does passport processing take?",
    a: "The Nigeria Immigration Service targets two to three weeks for fresh applications and about one week for renewals after biometric capture, where there are no discrepancies in your records. Delays usually come from data mismatches with your NIN, so confirm your NIMC records match your application.",
    kw: "how long duration processing time weeks tsawon lokaci renewal igba melo ole mgbe how long e dey take yaushe dauka bayar makonni fasfo",
    src: "https://immigration.gov.ng/" },
  { id: "pp-05", domain: "passport", agency: "NIS", lang: "ha",
    q: "Yaya ake neman fasfo na kasa da kasa?",
    a: "Ana neman fasfo ta yanar gizo a shafin hukumar shige da fice (NIS): ka bude asusu, ka cika fom, ka shigar da lambar NIN dinka, ka biya kudin a shafin, sannan ka zabi ranar da za a dauki hotonka da yatsunka a ofishin fasfo. Kada ka biya ta hannun dan tsakani.",
    kw: "fasfo neman yadda ake hausa shige da fice immigration rijista",
    src: "https://passport.immigration.gov.ng/" },
  { id: "pp-06", domain: "passport", agency: "NIS", lang: "yo",
    q: "Bawo ni mo se le gba iwe irinna (passport)?",
    a: "Beere lori ayelujara ni oju opo iwe irinna ti NIS: sii akanti, kun fomu naa, fi NIN re sii, san owo naa lori oju opo, ki o si yan ojo ipade ni ofiisi iwe irinna fun yiya aworan ati ika owo. Ma san owo fun alarina.",
    kw: "iwe irinna passport bawo ni yoruba gba beere ayelujara",
    src: "https://passport.immigration.gov.ng/" },
  { id: "pp-07", domain: "passport", agency: "NIS", lang: "ig",
    q: "Kedu ka m ga-esi nweta paspotu njem mba ozo?",
    a: "Tinye akwukwo n'intanet na websaiti paspotu nke NIS: mepee akaunti, dejuo fomu, tinye NIN gi, kwuo ugwo n'intanet, wee horo ubochi nzuko n'ulo oru paspotu maka ise foto na mkpisi aka. Akwula onye ozo ugwo n'aka.",
    kw: "paspotu kedu igbo nweta njem mba ozo intanet",
    src: "https://passport.immigration.gov.ng/" },
  { id: "pp-08", domain: "passport", agency: "NIS", lang: "pcm",
    q: "How person go take apply for international passport?",
    a: "Na online you go apply for the NIS passport portal: open account, fill the form, put your NIN, pay the money online, then book appointment for passport office where dem go snap you and take fingerprint. No give agent or middleman money o.",
    kw: "passport pidgin how person go take apply online no agent",
    src: "https://passport.immigration.gov.ng/" },

  // ---------------- Driver's licence / FRSC ----------------
  { id: "dl-01", domain: "licence", agency: "FRSC", lang: "en",
    q: "How do I get a new driver's licence in Nigeria?",
    a: "First complete training at an accredited driving school and obtain their certificate. Then apply on the FRSC National Driver's Licence portal, pay online, and present yourself at a Driver's Licence Centre for physical capture (biometrics, eye test) with your driving school certificate and a valid ID. A temporary licence is issued while the card is produced.",
    kw: "driver licence license new apply lasin tuki yadda ake frsc driving school iwe ase iwako ikike inya ugbo bawo kedu how i go take get",
    src: "https://nigeriadriverslicence.org/" },
  { id: "dl-02", domain: "licence", agency: "FRSC", lang: "en",
    q: "How much is the Nigerian driver's licence?",
    a: "As at the last published schedule, the 5-year licence costs N10,350 and the 3-year licence N6,350, paid online through the official portal. Confirm the current amount on the portal before paying, and avoid touts — payment outside the portal is not valid.",
    kw: "cost fee price how much nawa kudin lasin tuki naira 5 year 3 year elo owo ego ole how much license dey cost",
    src: "https://nigeriadriverslicence.org/" },
  { id: "dl-03", domain: "licence", agency: "FRSC", lang: "en",
    q: "How do I renew my driver's licence?",
    a: "Renewal is done on the same FRSC portal: fill the renewal form with your existing licence number, pay online, and visit a licence centre for biometric verification. Renewal does not require going back to driving school. Start before your current licence expires to stay legal on the road.",
    kw: "renew renewal expired sabunta lasin tuki yadda tunse mmeghari renew license",
    src: "https://nigeriadriverslicence.org/" },
  { id: "dl-04", domain: "licence", agency: "FRSC", lang: "ha",
    q: "Yaya ake samun lasin tuki?",
    a: "Da farko ka kammala horo a makarantar koyon tuki da gwamnati ta amince da ita, ka karbi takardar shedar su. Sannan ka nemi lasin a shafin FRSC, ka biya a yanar gizo, ka je cibiyar lasin tuki don daukar hoto da gwajin ido, tare da takardar makarantar tuki da shaidar kanka.",
    kw: "lasin tuki hausa yadda ake samun frsc makarantar tuki",
    src: "https://nigeriadriverslicence.org/" },
  { id: "dl-05", domain: "licence", agency: "FRSC", lang: "yo",
    q: "Bawo ni mo se le gba iwe ase iwako (driver's licence)?",
    a: "Kokoro ni ki o pari eko ni ile-eko iwako ti ijoba fowosi, ki o gba iwe eri won. Leyin naa, beere lori oju opo FRSC, san owo lori ayelujara, ki o lo si ile-ise iwe ase iwako fun yiya aworan ati ayewo oju, pelu iwe eri ile-eko iwako re.",
    kw: "iwe ase iwako bawo ni yoruba frsc ile eko iwako",
    src: "https://nigeriadriverslicence.org/" },
  { id: "dl-06", domain: "licence", agency: "FRSC", lang: "ig",
    q: "Kedu ka m ga-esi nweta ikike inya ugbo ala?",
    a: "Buru uzo gucha ozuzu n'ulo akwukwo inya ugbo ala nke govumenti kwadoro, nata akwukwo ha. Mgbe ahu, tinye akwukwo na websaiti FRSC, kwuo ugwo n'intanet, gaa n'ulo oru ikike inya ugbo maka ise foto na nyocha anya, jiri akwukwo ulo akwukwo inya ugbo gi.",
    kw: "ikike inya ugbo ala kedu igbo frsc ulo akwukwo",
    src: "https://nigeriadriverslicence.org/" },
  { id: "dl-07", domain: "licence", agency: "FRSC", lang: "pcm",
    q: "How I go take get driver license?",
    a: "First thing, go driving school wey government approve, collect their certificate. Then apply for the FRSC portal, pay online, come show face for licence centre make dem snap you and check your eye, with your driving school certificate and valid ID. Dem go give you temporary licence while the main card dey come.",
    kw: "driver license pidgin how i go take get driving school frsc",
    src: "https://nigeriadriverslicence.org/" },

  // ---------------- Birth certificate / NPC ----------------
  { id: "bc-01", domain: "birth", agency: "NPC", lang: "en",
    q: "How do I register a birth and get a birth certificate?",
    a: "Births are registered with the National Population Commission (NPC) at registration centres, many of them inside hospitals and local government offices. Registration within the first 60 days is free. A parent presents the hospital delivery record (or a declaration where there is none) and their own ID, and the NPC issues the birth certificate.",
    kw: "birth certificate register registration takardar haihuwa yadda ake npc baby child iwe eri ibi akwukwo omumu bawo kedu pikin born",
    src: "https://nationalpopulation.gov.ng/" },
  { id: "bc-02", domain: "birth", agency: "NPC", lang: "en",
    q: "Can an adult without a birth certificate get one?",
    a: "Yes. An adult whose birth was never registered can obtain an attestation of birth from the NPC, supported by an age declaration sworn before a court. This attestation is accepted for NIN enrolment and passport applications. Apply at an NPC state office with your age declaration and a valid means of identification.",
    kw: "adult attestation age declaration late registration babba manya takardar haihuwa agba okenye big person no get birth certificate i dont have never registered 30 years old grown without",
    src: "https://nationalpopulation.gov.ng/" },
  { id: "bc-03", domain: "birth", agency: "NPC", lang: "ha",
    q: "Yaya ake yin rijistar haihuwa da samun takardar haihuwa?",
    a: "Ana yin rijistar haihuwa a ofisoshin Hukumar Kidaya (NPC), da yawa suna cikin asibitoci da ofisoshin karamar hukuma. Rijista cikin kwanaki 60 na farko kyauta ce. Iyaye su kai takardar asibiti da shaidar kansu, sai NPC ta ba da takardar haihuwa.",
    kw: "takardar haihuwa rijista hausa yadda ake npc kyauta yaro",
    src: "https://nationalpopulation.gov.ng/" },
  { id: "bc-04", domain: "birth", agency: "NPC", lang: "yo",
    q: "Bawo ni a se n forukosile omo tuntun ti a bi?",
    a: "A n forukosile ibi omo ni awon ile-ise NPC, opolopo won wa ninu ile iwosan ati ofiisi ijoba ibile. Iforukosile laarin ojo ogota (60) akoko je ofe. Obi yoo mu iwe ile iwosan ati iwe idanimo ara won wa, NPC yoo si fun won ni iwe eri ibi.",
    kw: "iwe eri ibi forukosile omo bawo ni yoruba npc ofe",
    src: "https://nationalpopulation.gov.ng/" },
  { id: "bc-05", domain: "birth", agency: "NPC", lang: "ig",
    q: "Kedu ka e si edebanye omumu nwa?",
    a: "A na-edebanye omumu nwa n'ulo oru NPC, otutu n'ime ha di n'ulo ogwu na ulo oru ochichi ime obodo. Ndebanye n'ime ubochi iri isii (60) mbu bu n'efu. Nne ma o bu nna ga-ebu akwukwo ulo ogwu na ihe ngosi nke ha, NPC ga-enye akwukwo omumu.",
    kw: "akwukwo omumu nwa kedu igbo npc efu debanye",
    src: "https://nationalpopulation.gov.ng/" },
  { id: "bc-06", domain: "birth", agency: "NPC", lang: "pcm",
    q: "How dem dey register pikin wey dem born?",
    a: "Na for NPC office dem dey register pikin, plenty of dem dey inside hospital and local government office. If you register am within the first 60 days, na free. Papa or mama go carry the hospital paper and their own ID go there, NPC go give dem the birth certificate.",
    kw: "register pikin born pidgin birth certificate free npc hospital",
    src: "https://nationalpopulation.gov.ng/" },
];

/* ---------- RETRIEVAL LAYER (pgvector cosine-similarity stand-in) ----------
   Hardened after audit:
   1. Multilingual stopword removal — question scaffolding ("how much",
      "yaya ake", "kedu ka", "bawo ni", "how i go take") no longer
      dominates similarity scores.
   2. Domain-anchor gate — a query must contain at least one strong
      domain term (or score very high) before retrieval is accepted,
      giving the crisp out-of-scope fallback demanded by TC-03.
   3. Typo repair — out-of-vocabulary tokens are corrected to the
      nearest KB vocabulary word within edit distance 2 ("passprt"
      → "passport"). Production embeddings handle this semantically. */
const STOP = new Set(("how much many is are the a an do i my me you we what which when where can will go take dem dey na for from with and or to of in on be able person people wetin abi o no not am have has get wey but so it its this that " +
  "yaya ake ne na da a ka ki za ana ya ta ba ni mu su wane wanne nawa me don kafin har yaushe " +
  "bawo ni mo se le ti a won yoo si fun ni nipa ki o tabi " +
  "kedu ka m ga esi si e nke ndi ma bu obula gi anyi ihe onye " +
  "ah oh please abeg biko jowo don").split(/\s+/));

const ANCHORS = new Set(("nin nimc enrolment enrollment " +
  "passport fasfo irinna paspotu immigration nis " +
  "licence license lasin tuki iwako ugbo driver driving frsc " +
  "birth haihuwa ibi omumu pikin born npc certificate takardar attestation").split(/\s+/));

const tokenize = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s']/g, " ").split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

function editDist(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function buildIndex(entries) {
  const docs = entries.map((e) => tokenize(`${e.q} ${e.a} ${e.kw}`));
  const df = {};
  docs.forEach((toks) => new Set(toks).forEach((t) => (df[t] = (df[t] || 0) + 1)));
  const N = docs.length;
  const vecs = docs.map((toks) => {
    const tf = {};
    toks.forEach((t) => (tf[t] = (tf[t] || 0) + 1));
    const v = {};
    let norm = 0;
    for (const t in tf) {
      const w = (1 + Math.log(tf[t])) * Math.log(1 + N / (df[t] || 1));
      v[t] = w; norm += w * w;
    }
    return { v, norm: Math.sqrt(norm) || 1 };
  });
  return { vecs, df, N, vocab: Object.keys(df) };
}

function repairToken(tok, vocab) {
  if (tok.length < 4) return tok;
  let best = tok, bd = 3;
  for (const v of vocab) {
    if (Math.abs(v.length - tok.length) > 2) continue;
    const d = editDist(tok, v);
    if (d < bd) { bd = d; best = v; }
  }
  return bd <= 2 ? best : tok;
}

function retrieve(index, entries, query, k = 4) {
  let toks = tokenize(query);
  if (!toks.length) return [];
  toks = toks.map((t) => (index.df[t] ? t : repairToken(t, index.vocab)));
  const hasAnchor = toks.some((t) => ANCHORS.has(t));
  const tf = {};
  toks.forEach((t) => (tf[t] = (tf[t] || 0) + 1));
  const qv = {}; let qnorm = 0;
  for (const t in tf) {
    const w = (1 + Math.log(tf[t])) * Math.log(1 + index.N / (index.df[t] || 1));
    qv[t] = w; qnorm += w * w;
  }
  qnorm = Math.sqrt(qnorm) || 1;
  const scored = entries.map((e, i) => {
    let dot = 0;
    for (const t in qv) if (index.vecs[i].v[t]) dot += qv[t] * index.vecs[i].v[t];
    return { entry: e, score: dot / (qnorm * index.vecs[i].norm) };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k).filter((s) => s.score > 0.08);
  if (!top.length) return [];
  return hasAnchor || top[0].score > 0.4 ? top : [];
}

/* ---------- GENERATION LAYER (Gemini stand-in; identical prompt contract) ---------- */
const LANG_NAME = { en: "English", pcm: "Nigerian Pidgin", ha: "Hausa", yo: "Yoruba", ig: "Igbo" };

async function generateAnswer(query, retrieved, lang, history) {
  const context = retrieved
    .map((r, i) => `[Source ${i + 1} | ${r.entry.agency} | ${r.entry.src}]\nQ: ${r.entry.q}\nA: ${r.entry.a}`)
    .join("\n\n");
  const langName = LANG_NAME[lang];
  const sys = `You are a public service information assistant for Nigerian citizens, covering exactly four domains: NIN enrolment (NIMC), international passports (NIS), driver's licences (FRSC), and birth registration (NPC).
Rules:
- Answer ONLY from the provided sources. Never invent fees, dates, or requirements.
- Respond in ${langName}${lang === "yo" ? " with correct tone marks (diacritics)" : ""}${lang === "ig" ? " with correct Igbo orthography" : ""}, in plain, respectful language a first-time user understands. Keep it under 120 words.
- If the sources do not answer the question, say so briefly in ${langName} and advise contacting the relevant agency; do not guess.
- Where a fee is mentioned, remind the user to confirm the current amount on the official portal.
- Write plain sentences and simple numbered steps. Do not use markdown symbols such as **, ##, or bullet asterisks.`;
  const msgs = [
    { role: "system", content: sys },
    ...history.slice(-4).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
    { role: "user", content: `Sources:\n${context}\n\nCitizen's question: ${query}` },
  ];
  // Production (Vercel): key stays server-side behind /api/chat.
  // Local dev fallback: direct Groq call using VITE_GROQ_API_KEY from .env.
  const devKey = import.meta.env?.DEV ? import.meta.env?.VITE_GROQ_API_KEY : null;
  const url = devKey ? "https://api.groq.com/openai/v1/chat/completions" : "/api/chat";
  const headers = { "Content-Type": "application/json" };
  if (devKey) headers["Authorization"] = `Bearer ${devKey}`;
  const body = JSON.stringify(
    devKey
      ? { model: import.meta.env?.VITE_GROQ_MODEL || "openai/gpt-oss-120b", max_tokens: 1000, temperature: 0.3, messages: msgs }
      : { messages: msgs }
  );
  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) {
    let detail = "";
    try { const err = await res.json(); detail = err?.error?.message || err?.error || ""; } catch {}
    throw new Error(`Generation failed (${res.status}): ${detail || "check API key configuration"}`);
  }
  const data = await res.json();
  const content = (data.choices?.[0]?.message?.content || "")
    .replace(/\*\*|__|#+\s/g, "").trim();
  if (!content) throw new Error("Generation returned no content");
  return content;
}

/* ---------- UI STRINGS (language parity across all five) ---------- */
const T = {
  en: {
    label: "English",
    title: "Public services, in your language",
    sub: "Verified answers on NIN, passports, driver's licences and birth registration. No middlemen.",
    placeholder: "Ask about NIN, passport, licence or birth certificate…",
    listening: "Listening… speak now",
    sources: "Sources",
    speak: "Read aloud", stop: "Stop reading",
    fallback: "That's outside what I can help with. I only cover NIN enrolment, international passports, driver's licences and birth registration. For other matters, please contact the relevant agency directly.",
    error: "Something went wrong reaching the answer service. Check your connection and try again.",
    disclaimer: "Grounded in official agency content · Verify fees on official portals · Demo build",
    domains: [
      { d: "nin", t: "NIN enrolment", a: "NIMC", q: "How do I enrol for my NIN?" },
      { d: "passport", t: "Int'l passport", a: "NIS", q: "How do I apply for an international passport?" },
      { d: "licence", t: "Driver's licence", a: "FRSC", q: "How do I get a new driver's licence?" },
      { d: "birth", t: "Birth certificate", a: "NPC", q: "How do I register a birth?" },
    ],
    hello: "Welcome! Ask me anything about the four services below — typed or by voice. Tap the speaker on any answer to hear it read aloud.",
  },
  pcm: {
    label: "Pidgin",
    title: "Government service, for your own language",
    sub: "Correct answer on NIN, passport, driver license and birth certificate. No agent, no middleman.",
    placeholder: "Ask about NIN, passport, license or birth paper…",
    listening: "I dey hear you… talk now",
    sources: "Where e come from",
    speak: "Make e read am", stop: "Stop am",
    fallback: "Dat one pass wetin I fit help with. Na only NIN, international passport, driver license and birth registration I sabi. For other matter, abeg meet the agency wey concern am direct.",
    error: "Something spoil as I dey find the answer. Check your network make you try again.",
    disclaimer: "Answer dey come from official agency info · Confirm money for official portal · Na demo",
    domains: [
      { d: "nin", t: "NIN registration", a: "NIMC", q: "How I go take register my NIN?" },
      { d: "passport", t: "Passport", a: "NIS", q: "How person go take apply for international passport?" },
      { d: "licence", t: "Driver license", a: "FRSC", q: "How I go take get driver license?" },
      { d: "birth", t: "Birth certificate", a: "NPC", q: "How dem dey register pikin wey dem born?" },
    ],
    hello: "How far! Ask me anything about the four services wey dey down so — type am or talk am. Press the speaker for any answer make you hear am with ear.",
  },
  ha: {
    label: "Hausa",
    title: "Ayyukan gwamnati, cikin harshenka",
    sub: "Amsoshi ingantattu kan NIN, fasfo, lasin tuki da rijistar haihuwa. Ba tare da dan tsakani ba.",
    placeholder: "Tambaya kan NIN, fasfo, lasin ko takardar haihuwa…",
    listening: "Ana saurare… yi magana yanzu",
    sources: "Majiya",
    speak: "Karanta da murya", stop: "Tsayar",
    fallback: "Wannan ya wuce iyakar aikina. Ina taimako ne kawai kan rijistar NIN, fasfo, lasin tuki da rijistar haihuwa. Don wasu batutuwa, tuntubi hukumar da abin ya shafa kai tsaye.",
    error: "An samu matsala wajen samun amsa. Duba intanet dinka ka sake gwadawa.",
    disclaimer: "An gina amsoshi daga bayanan hukumomi · Tabbatar da kudade a shafukan hukuma · Gwajin tsari ne",
    domains: [
      { d: "nin", t: "Rijistar NIN", a: "NIMC", q: "Yaya ake yin rijistar NIN?" },
      { d: "passport", t: "Fasfo", a: "NIS", q: "Yaya ake neman fasfo na kasa da kasa?" },
      { d: "licence", t: "Lasin tuki", a: "FRSC", q: "Yaya ake samun lasin tuki?" },
      { d: "birth", t: "Takardar haihuwa", a: "NPC", q: "Yaya ake yin rijistar haihuwa?" },
    ],
    hello: "Sannu da zuwa! Tambaye ni komai kan ayyukan nan guda hudu — ta rubutu ko ta murya. Danna alamar lasifika a kowace amsa domin jin ta da murya.",
  },
  yo: {
    label: "Yorùbá",
    title: "Iṣẹ́ ìjọba, ní èdè rẹ",
    sub: "Ìdáhùn tí ó dájú lórí NIN, ìwé ìrìnnà, ìwé àṣẹ ìwakọ̀ àti ìforúkọsílẹ̀ ibí. Láìsí alárinà.",
    placeholder: "Bèèrè nípa NIN, ìwé ìrìnnà, ìwé àṣẹ tàbí ìwé ẹ̀rí ibí…",
    listening: "À ń gbọ́… sọ̀rọ̀ báyìí",
    sources: "Oríṣun",
    speak: "Kà á sókè", stop: "Dáwọ́ dúró",
    fallback: "Èyí kọjá ohun tí mo lè ràn ọ́ lọ́wọ́ lórí rẹ̀. NIN, ìwé ìrìnnà, ìwé àṣẹ ìwakọ̀ àti ìforúkọsílẹ̀ ibí nìkan ni mo bo. Fún ọ̀rọ̀ mìíràn, jọ̀wọ́ kàn sí àjọ tí ó kan án tààrà.",
    error: "Ìṣòro kan wáyé nígbà tí a ń wá ìdáhùn. Ṣàyẹ̀wò nẹ́tíwọ̀kì rẹ kí o gbìyànjú lẹ́ẹ̀kansí.",
    disclaimer: "Ìdáhùn wá láti inú ìwífún àjọ ìjọba · Ṣàyẹ̀wò owó lórí ojú òpó ìjọba · Àfihàn àdánwò ni",
    domains: [
      { d: "nin", t: "Ìforúkọsílẹ̀ NIN", a: "NIMC", q: "Bawo ni mo se le forukosile fun NIN?" },
      { d: "passport", t: "Ìwé ìrìnnà", a: "NIS", q: "Bawo ni mo se le gba iwe irinna?" },
      { d: "licence", t: "Ìwé àṣẹ ìwakọ̀", a: "FRSC", q: "Bawo ni mo se le gba iwe ase iwako?" },
      { d: "birth", t: "Ìwé ẹ̀rí ibí", a: "NPC", q: "Bawo ni a se n forukosile omo tuntun?" },
    ],
    hello: "Ẹ káàbọ̀! Bèèrè ohunkóhun nípa iṣẹ́ mẹ́rin tí ó wà nísàlẹ̀ — nípa kíkọ tàbí ohùn. Tẹ àmì agbóhùnsáfẹ́fẹ́ lórí ìdáhùn èyíkéyìí láti gbọ́ ọ.",
  },
  ig: {
    label: "Igbo",
    title: "Ọrụ gọọmenti, n'asụsụ gị",
    sub: "Azịza ziri ezi maka NIN, paspọtụ, ikike ịnya ụgbọ na ndebanye ọmụmụ. Enweghị onye etiti.",
    placeholder: "Jụọ maka NIN, paspọtụ, ikike ma ọ bụ akwụkwọ ọmụmụ…",
    listening: "Anyị na-ege ntị… kwuo ugbu a",
    sources: "Ebe o si",
    speak: "Gụọ ya n'olu", stop: "Kwụsị",
    fallback: "Nke ahụ gafere ihe m nwere ike inyere gị aka. Naanị NIN, paspọtụ, ikike ịnya ụgbọ na ndebanye ọmụmụ ka m na-akpọ. Maka ihe ndị ọzọ, biko gakwuru ụlọ ọrụ metụtara ya ozugbo.",
    error: "Nsogbu mere mgbe anyị na-achọ azịza. Lelee netwọk gị ma nwaa ọzọ.",
    disclaimer: "Azịza si n'ozi ụlọ ọrụ gọọmenti · Chọpụta ego ọnụ na websaiti gọọmenti · Ọ bụ ngosi nnwale",
    domains: [
      { d: "nin", t: "Ndebanye NIN", a: "NIMC", q: "Kedu ka m ga-esi debanye aha maka NIN?" },
      { d: "passport", t: "Paspọtụ", a: "NIS", q: "Kedu ka m ga-esi nweta paspotu njem mba ozo?" },
      { d: "licence", t: "Ikike ịnya ụgbọ", a: "FRSC", q: "Kedu ka m ga-esi nweta ikike inya ugbo ala?" },
      { d: "birth", t: "Akwụkwọ ọmụmụ", a: "NPC", q: "Kedu ka e si edebanye omumu nwa?" },
    ],
    hello: "Nnọọ! Jụọ m ihe ọbụla gbasara ọrụ anọ ndị dị n'okpuru — site n'ide ma ọ bụ olu. Pịa akara ọkà okwu na azịza ọbụla ka ị nụrụ ya n'olu.",
  },
};

const AGENCY_COLOR = { NIMC: "#0B6B3A", NIS: "#1D4E89", FRSC: "#8A5A00", NPC: "#5B3A8E" };
const STT_LANG = { en: "en-NG", pcm: "en-NG", ha: "ha-NG", yo: "yo-NG", ig: "ig-NG" };
const TTS_LANG = { en: "en-NG", pcm: "en-NG", ha: "ha", yo: "yo", ig: "ig" };

/* ---------- COMPONENT ---------- */
export default function IndigenousLanguageChatbot() {
  const [lang, setLang] = useState("en");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceErr, setVoiceErr] = useState("");
  const [voiceOk, setVoiceOk] = useState(true);
  const [ttsOk, setTtsOk] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(-1);
  const scrollRef = useRef(null);
  const recRef = useRef(null);
  const viaVoiceRef = useRef(false);
  const langRef = useRef("en");
  const index = useMemo(() => buildIndex(KB), []);
  const t = T[lang];
  langRef.current = lang;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    setTtsOk(typeof window !== "undefined" && "speechSynthesis" in window);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceOk(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setListening(false);
      setVoiceErr("");
      viaVoiceRef.current = true;
      ask(text);
    };
    rec.onerror = (e) => {
      setListening(false);
      const map = {
        "not-allowed": "Mic blocked. Allow microphone access for this page, then try again.",
        "service-not-allowed": "Mic blocked by the browser or app. Try opening in Chrome and allowing the microphone.",
        "audio-capture": "No microphone found on this device.",
        "no-speech": "Didn't catch any speech. Tap the mic and speak clearly.",
        "network": "Speech recognition needs an internet connection.",
        "language-not-supported": "This browser can't recognise the selected language yet. English works everywhere.",
        "aborted": "",
      };
      setVoiceErr(e && e.error in map ? map[e.error] : `Mic error: ${e && e.error ? e.error : "unknown"}`);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => { try { window.speechSynthesis.cancel(); } catch {} };
  }, []);

  const startVoice = () => {
    if (!recRef.current || busy) return;
    setVoiceErr("");
    try {
      recRef.current.lang = STT_LANG[langRef.current];
      recRef.current.start();
      setListening(true);
    } catch { setListening(false); }
  };

  /* Text-to-speech: prefer a device voice matching the language,
     fall back to any English voice (browser gap for ha/yo/ig —
     production uses cloud TTS with Nigerian voices). */
  const speak = (text, idx) => {
    if (!ttsOk) return;
    const synth = window.speechSynthesis;
    if (speakingIdx === idx) { synth.cancel(); setSpeakingIdx(-1); return; }
    synth.cancel();
    const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "");
    const u = new SpeechSynthesisUtterance(clean);
    const want = TTS_LANG[langRef.current];
    const voices = synth.getVoices();
    const match =
      voices.find((v) => v.lang.toLowerCase().startsWith(want.toLowerCase())) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(want.split("-")[0])) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (match) u.voice = match;
    u.lang = want;
    u.rate = 0.95;
    u.onend = () => setSpeakingIdx(-1);
    u.onerror = () => setSpeakingIdx(-1);
    setSpeakingIdx(idx);
    synth.speak(u);
  };

  const GREET = new Set(("hi hello hey hiya yo sup howdy morning afternoon evening " +
    "good how far wetin dey happen you na who are u claude abeg oo o una " +
    "sannu salama barka ina kwana yaya dai lafiya kalau " +
    "bawo e kaaro kaasan kaale pele eku se daadaa ni " +
    "kedu ndewo ibola olaotu nnoo kee maka gi").split(/\s+/));
  const isGreeting = (q) => {
    const toks = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z\s']/g, " ").split(/\s+/).filter(Boolean);
    return toks.length > 0 && toks.length <= 5 && toks.every((t) => GREET.has(t));
  };

  async function ask(raw) {
    const query = raw.trim();
    if (!query || busy) return;
    const wasVoice = viaVoiceRef.current;
    viaVoiceRef.current = false;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: query }]);
    setBusy(true);
    const t0 = performance.now();
    const L = langRef.current;
    if (isGreeting(query)) {
      const greetMsg = { role: "bot", text: T[L].hello, sources: [], ms: 0 };
      setMessages((m) => {
        const next = [...m, greetMsg];
        if (wasVoice) setTimeout(() => speak(greetMsg.text, next.length - 1), 250);
        return next;
      });
      setBusy(false);
      return;
    }
    try {
      const hits = retrieve(index, KB, query, 4);
      let botMsg;
      if (!hits.length) {
        botMsg = { role: "bot", text: T[L].fallback, sources: [], ms: Math.round(performance.now() - t0) };
      } else {
        const history = messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text }));
        const answer = await generateAnswer(query, hits, L, history);
        const seen = new Set();
        const sources = hits.filter((h) => (seen.has(h.entry.src) ? false : seen.add(h.entry.src)))
          .map((h) => ({ agency: h.entry.agency, src: h.entry.src }));
        botMsg = { role: "bot", text: answer || T[L].fallback, sources, ms: Math.round(performance.now() - t0) };
      }
      setMessages((m) => {
        const next = [...m, botMsg];
        if (wasVoice) setTimeout(() => speak(botMsg.text, next.length - 1), 250);
        return next;
      });
    } catch (err) {
      const hint = err && err.message && err.message.startsWith("Generation") ? `\n(${err.message})` : "";
      setMessages((m) => [...m, { role: "bot", text: T[L].error + hint, sources: [], ms: 0 }]);
    }
    setBusy(false);
  }

  return (
    <div className="ilc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap');
        .ilc-root{min-height:100vh;background:#F6F7F4;font-family:'Lexend',system-ui,sans-serif;color:#1A241E;display:flex;flex-direction:column;}
        .ilc-root *{box-sizing:border-box;}
        .ilc-root button{cursor:pointer;font-family:inherit;}
        .ilc-root button:focus-visible,.ilc-root input:focus-visible,.ilc-root a:focus-visible{outline:3px solid #0B6B3A;outline-offset:2px;border-radius:6px;}
        .mast{background:#0B4225;color:#F4F8F2;padding:18px 20px 24px;position:relative;overflow:hidden;}
        .mast::after{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 2px,transparent 2px 14px);pointer-events:none;}
        .mast-in{max-width:760px;margin:0 auto;position:relative;z-index:1;}
        .mast-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
        .brand{display:flex;align-items:center;gap:10px;font-weight:600;letter-spacing:.2px;font-size:15px;}
        .seal{width:34px;height:34px;border-radius:50%;background:#0B6B3A;border:2px solid #7FB894;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#EAF6EE;}
        .langtog{display:flex;background:rgba(255,255,255,.12);border-radius:999px;padding:3px;gap:2px;overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
        .langtog::-webkit-scrollbar{display:none;}
        .langtog button{border:0;background:transparent;color:#CFE3D5;padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:600;transition:all .18s ease;white-space:nowrap;flex:0 0 auto;}
        .langtog button.on{background:#F4F8F2;color:#0B4225;box-shadow:0 2px 6px rgba(0,0,0,.25);}
        .hero-t{font-size:clamp(21px,4.5vw,29px);font-weight:700;line-height:1.15;margin:16px 0 6px;}
        .hero-s{font-size:14px;font-weight:300;color:#BCD6C4;max-width:48ch;line-height:1.55;margin:0;}
        .wrap{max-width:760px;margin:0 auto;width:100%;flex:1;display:flex;flex-direction:column;padding:0 14px;}
        .chips{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:-16px 0 14px;position:relative;z-index:2;}
        @media(min-width:640px){.chips{grid-template-columns:repeat(4,1fr);}}
        .chip{border:1px solid #E1E7E0;background:#fff;border-radius:14px;padding:12px;text-align:left;box-shadow:0 1px 2px rgba(20,40,28,.06),0 8px 20px -12px rgba(20,40,28,.18);transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease;}
        .chip:hover{transform:translateY(-3px);box-shadow:0 2px 4px rgba(20,40,28,.08),0 14px 28px -12px rgba(20,40,28,.26);}
        .chip:active{transform:translateY(-1px) scale(.98);}
        .chip b{display:block;font-size:13px;font-weight:600;margin-top:6px;color:#1A241E;}
        .chip span{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;color:#fff;}
        .chat{flex:1;overflow-y:auto;padding:6px 2px 12px;display:flex;flex-direction:column;gap:14px;min-height:220px;}
        .msg{max-width:86%;padding:12px 15px;border-radius:16px;font-size:14.5px;line-height:1.6;animation:rise .3s ease both;white-space:pre-wrap;}
        @media(prefers-reduced-motion:reduce){.msg,.chip,.langtog button,.mic.on{animation:none!important;transition:none!important;}}
        @keyframes rise{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
        .msg.user{align-self:flex-end;background:#0B6B3A;color:#F2F8F4;border-bottom-right-radius:5px;}
        .msg.bot{align-self:flex-start;background:#fff;border:1px solid #E4EAE3;border-bottom-left-radius:5px;box-shadow:0 1px 2px rgba(20,40,28,.05);}
        .meta{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap;}
        .lat{font-size:11px;color:#6B7A70;font-weight:500;}
        .spk{border:1px solid #DCE5DC;background:#F3F7F2;color:#0B6B3A;border-radius:999px;padding:4px 12px;font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;transition:background .18s ease,transform .18s ease;}
        .spk:hover{background:#E6EFE6;transform:translateY(-1px);}
        .spk.on{background:#0B6B3A;color:#fff;border-color:#0B6B3A;}
        .srcs{align-self:flex-start;max-width:86%;display:flex;flex-direction:column;gap:6px;margin-top:-6px;}
        .srct{font-size:11px;font-weight:600;color:#6B7A70;letter-spacing:.3px;}
        .src{display:block;text-decoration:none;background:#fff;border:1px solid #E4EAE3;border-left:4px solid var(--ac);border-radius:10px;padding:8px 12px;font-size:12.5px;color:#2A3830;transition:transform .18s ease,box-shadow .18s ease;}
        .src:hover{transform:translateX(3px);box-shadow:0 4px 12px -6px rgba(20,40,28,.25);}
        .src b{color:var(--ac);font-weight:600;margin-right:6px;}
        .typing{align-self:flex-start;background:#fff;border:1px solid #E4EAE3;border-radius:16px;border-bottom-left-radius:5px;padding:14px 18px;display:flex;gap:5px;}
        .typing i{width:7px;height:7px;border-radius:50%;background:#0B6B3A;animation:blink 1.2s infinite;}
        .typing i:nth-child(2){animation-delay:.2s}.typing i:nth-child(3){animation-delay:.4s}
        @keyframes blink{0%,80%,100%{opacity:.25;transform:scale(.85)}40%{opacity:1;transform:scale(1)}}
        .bar{position:sticky;bottom:0;background:linear-gradient(to top,#F6F7F4 75%,transparent);padding:8px 0 14px;}
        .barin{display:flex;gap:8px;background:#fff;border:1px solid #DDE4DC;border-radius:16px;padding:8px;box-shadow:0 4px 18px -8px rgba(20,40,28,.22);}
        .barin input{flex:1;border:0;background:transparent;font-size:15px;font-family:inherit;padding:8px 10px;color:#1A241E;min-width:0;}
        .barin input:focus{outline:none;}
        .mic,.sendb{border:0;border-radius:12px;width:44px;height:44px;flex:0 0 44px;display:flex;align-items:center;justify-content:center;transition:transform .18s ease,background .18s ease;}
        .mic{background:#EEF3EC;color:#0B6B3A;}
        .mic:hover{background:#E1EBE0;}
        .mic.on{background:#0B6B3A;color:#fff;animation:pulse 1.4s infinite;}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(11,107,58,.45)}70%{box-shadow:0 0 0 12px rgba(11,107,58,0)}100%{box-shadow:0 0 0 0 rgba(11,107,58,0)}}
        .sendb{background:#0B6B3A;color:#fff;}
        .sendb:hover{transform:scale(1.06);}
        .sendb:disabled{opacity:.4;transform:none;cursor:default;}
        .listen{font-size:12.5px;color:#0B6B3A;font-weight:500;padding:4px 2px 0;}
        .foot{text-align:center;font-size:11px;color:#8A968D;padding:0 16px 16px;line-height:1.5;}
      `}</style>

      <header className="mast">
        <div className="mast-in">
          <div className="mast-row">
            <div className="brand"><div className="seal">₦</div>CivicSpeak NG</div>
            <div className="langtog" role="group" aria-label="Language">
              {Object.keys(T).map((code) => (
                <button key={code} className={lang === code ? "on" : ""} onClick={() => { setLang(code); try { window.speechSynthesis.cancel(); } catch {} setSpeakingIdx(-1); }}>
                  {T[code].label}
                </button>
              ))}
            </div>
          </div>
          <h1 className="hero-t">{t.title}</h1>
          <p className="hero-s">{t.sub}</p>
        </div>
      </header>

      <div className="wrap">
        <div className="chips">
          {t.domains.map((d) => (
            <button key={d.d} className="chip" onClick={() => ask(d.q)}>
              <span style={{ background: AGENCY_COLOR[d.a] }}>{d.a}</span>
              <b>{d.t}</b>
            </button>
          ))}
        </div>

        <div className="chat" ref={scrollRef} aria-live="polite">
          <div className="msg bot">{t.hello}</div>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "contents" }}>
              <div className={`msg ${m.role === "user" ? "user" : "bot"}`}>
                {m.text}
                {m.role === "bot" && (
                  <div className="meta">
                    {ttsOk && (
                      <button className={`spk ${speakingIdx === i ? "on" : ""}`} onClick={() => speak(m.text, i)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                        </svg>
                        {speakingIdx === i ? t.stop : t.speak}
                      </button>
                    )}
                    {m.ms > 0 && <span className="lat">⏱ {(m.ms / 1000).toFixed(1)}s</span>}
                  </div>
                )}
              </div>
              {m.role === "bot" && m.sources && m.sources.length > 0 && (
                <div className="srcs">
                  <div className="srct">{t.sources}</div>
                  {m.sources.map((s, j) => (
                    <a key={j} className="src" href={s.src} target="_blank" rel="noreferrer"
                       style={{ "--ac": AGENCY_COLOR[s.agency] }}>
                      <b>{s.agency}</b>{s.src.replace("https://", "")}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="typing" aria-label="Generating answer"><i /><i /><i /></div>}
        </div>

        <div className="bar">
          {listening && <div className="listen">🎙 {t.listening}</div>}
          {!listening && voiceErr && <div className="listen" style={{ color: "#A33A2E" }}>{voiceErr}</div>}
          {!voiceOk && <div className="listen" style={{ color: "#8A968D" }}>Voice input isn't supported in this browser (try Chrome). Typing and read-aloud still work.</div>}
          <div className="barin">
            {voiceOk && (
              <button className={`mic ${listening ? "on" : ""}`} onClick={startVoice} aria-label="Voice input" title="Voice input">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              disabled={busy}
            />
            <button className="sendb" onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="foot">{t.disclaimer}</div>
      </div>
    </div>
  );
}
