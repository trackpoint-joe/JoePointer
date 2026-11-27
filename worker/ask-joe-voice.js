// ============================================================
// ASK JOE: spoken answers (ElevenLabs). Code to ADD to the
// joe-portfolio-chat Cloudflare Worker. Not loaded by the site.
//
// The Worker's source lives only in Cloudflare, so this is a patch to paste
// in, not a replacement. Keep everything the Worker already does (system
// prompt, company context, origin check, rate limits). Steps are in
// worker/README.md.
//
// Rule this code keeps: the voice only ever reads the Worker's OWN answer
// from Claude. Never add a route that turns text sent by a visitor into
// Joe's voice. That would let anyone make "Joe" say anything.
//
// Secrets (Workers > joe-portfolio-chat > Settings > Variables and Secrets,
// type "Secret"):
//   ELEVENLABS_API_KEY   the ElevenLabs API key
//   ELEVENLABS_VOICE_ID  the voice to speak with
//   ELEVENLABS_MODEL     optional, defaults to eleven_flash_v2_5
// If either of the first two is missing, answers come back as text with a
// short "Voice is not switched on yet." note. Nothing breaks.
// ============================================================

// Append to the system prompt only when the visitor turned voice on.
const VOICE_ADDENDUM =
  '\n\nThis answer will be spoken aloud. Keep it under 70 words, in plain sentences with no markdown, bullets, or symbols, and write numbers and names so they read well aloud.';

// Add this line to the system prompt for EVERY request, voice or not, so the
// assistant is honest about what a visitor is hearing:
const VOICE_DISCLOSURE =
  '\nIf a visitor asks whether they are talking to the real Joe, a person, or a recording, say plainly that you are an AI, and that any voice they hear is an AI voice, not Joe speaking.';

// Per-isolate limit on spoken answers. It slows casual abuse; it does not
// stop a determined one. The real backstop is a monthly character/credit cap
// in the ElevenLabs account.
const VOICE_WINDOW_MS = 10 * 60 * 1000;
const MAX_VOICE = 6;
const voiceHits = new Map();

function voiceLimited(ip) {
  const now = Date.now();
  const list = (voiceHits.get(ip) || []).filter((t) => now - t < VOICE_WINDOW_MS);
  list.push(now);
  voiceHits.set(ip, list);
  if (voiceHits.size > 5000) voiceHits.clear();
  return list.length > MAX_VOICE;
}

// Joe's answers can carry markdown (bold, bullets, links). Speak the words only.
function speakableText(reply) {
  return reply
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
    .replace(/https?:\/\/\S+/g, '')          // bare URLs are noise when spoken
    .replace(/[*_#`>]+/g, '')                // emphasis, headings, code, quotes
    .replace(/^\s*[-•]\s+/gm, '')            // bullet markers
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 900);
}

// Workers have no Buffer by default. Chunked so long clips do not overflow
// String.fromCharCode's argument limit.
function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

// Turns the Worker's own reply into speech. Returns { audio } or { voiceNote }.
async function speak(reply, env, ip) {
  const key = env.ELEVENLABS_API_KEY;
  const voiceId = env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId) return { voiceNote: 'Voice is not switched on yet.' };
  if (voiceLimited(ip)) return { voiceNote: 'Voice limit reached for now. Text answers still work.' };
  const text = speakableText(reply);
  if (!text) return {};
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL || 'eleven_flash_v2_5' }),
      }
    );
    if (!r.ok) {
      console.error('ElevenLabs error', r.status, await r.text());
      return { voiceNote: 'The voice could not be made this time.' };
    }
    return { audio: 'data:audio/mpeg;base64,' + toBase64(await r.arrayBuffer()) };
  } catch (e) {
    console.error(e);
    return { voiceNote: 'The voice could not be made this time.' };
  }
}

// ------------------------------------------------------------
// HOW TO WIRE IT IN (three small edits inside the existing fetch handler).
// Variable names below are examples; use the ones the Worker already has.
//
// 1) After the Worker reads the request body:
//
//      const wantVoice = body && body.voice === true;
//      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
//
// 2) Where the Worker builds the system prompt for Anthropic:
//
//      system: systemPrompt + VOICE_DISCLOSURE + (wantVoice ? VOICE_ADDENDUM : ''),
//
//    Do NOT forward the visitor's "voice" field to Anthropic; it only
//    decides whether to speak.
//
// 3) Where the Worker returns Claude's answer to the browser. The site reads
//    data.content[0].text, so add the voice fields next to it:
//
//      const data = await anthropicResponse.json();
//      if (wantVoice) {
//        const reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
//        if (reply) Object.assign(data, await speak(reply, env, ip));
//      }
//      return new Response(JSON.stringify(data), { status: anthropicResponse.status, headers: <the headers it already sends> });
//
//    If the Worker currently passes Anthropic's response straight through
//    (return new Response(anthropicResponse.body, ...)), switch to the
//    parse-then-return form above. Keep its existing CORS headers.
// ------------------------------------------------------------
