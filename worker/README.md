# Ask Joe voice: Worker setup

The site already has the Voice button (in the Ask Joe header). The spoken answer itself has to come from the `joe-portfolio-chat` Cloudflare Worker, because that is where secret keys live. Until the Worker is updated, turning Voice on does nothing harmful: answers keep arriving as text.

## 1. Add the secrets

Cloudflare dashboard > Workers & Pages > `joe-portfolio-chat` > Settings > Variables and Secrets > Add:

| Name | Type | Value |
|---|---|---|
| `ELEVENLABS_API_KEY` | Secret | the key Mike sends you (never paste it into GitHub, email threads, or chat) |
| `ELEVENLABS_VOICE_ID` | Secret | the ElevenLabs voice to use (see below) |

Optional: `ELEVENLABS_MODEL` (default `eleven_flash_v2_5`, the fast, cheap one).

Command line alternative: `npx wrangler secret put ELEVENLABS_API_KEY`, then the same for `ELEVENLABS_VOICE_ID`.

**Voice ID.** In ElevenLabs, open Voices, pick a voice (or a clone of your own voice, made with your consent), and copy its Voice ID. The site and the assistant both say the voice is AI, so a stock voice or your own clone are both honest.

## 2. Paste in the code

Open the Worker in the dashboard (Edit code). Copy everything above the "HOW TO WIRE IT IN" line in `worker/ask-joe-voice.js` and paste it near the top of the Worker, outside the `fetch` handler. Then make the three small edits described at the bottom of that file:

1. Read `voice` from the request body.
2. Add `VOICE_DISCLOSURE` to the system prompt always, and `VOICE_ADDENDUM` when voice is on (it keeps spoken answers short).
3. Add `audio` / `voiceNote` to the JSON the Worker sends back.

Deploy. If it is easier, send Mike the Worker code and he will make these edits.

## 3. Check it

On joepointer.com, open Ask Joe, tap **Voice off** so it reads **Voice on**, and ask a question. The answer should play and show a **Play again** button. If you see "Voice is not switched on yet.", a secret is missing or misnamed.

## Cost guard

Each visitor gets at most 6 spoken answers per 10 minutes (per Worker instance). Set a monthly usage cap in the ElevenLabs account as the real backstop.

## The one rule

The Worker only speaks its own answer from Claude. Never add an endpoint that turns text sent by a visitor into speech, or anyone could make the voice say anything.
