# Ask Joe voice: Worker setup

The site already has the Voice button (in the Ask Joe header). The spoken answer itself has to come from the `joe-portfolio-chat` Cloudflare Worker, because that is where secret keys live. Until the Worker is updated, turning Voice on does nothing harmful: answers keep arriving as text.

## 0. Find your existing Worker

You already have this Worker. You set it up in March 2026, when the chat's Anthropic key moved out of the website. You don't need to create anything new. Your site is hosted on GitHub Pages, and the chat runs as a small separate service on Cloudflare.

1. Go to dash.cloudflare.com and log in with the account that manages joepointer.com. Your domain's DNS is on Cloudflare, so this is that same account.
2. In the left menu, open **Compute (Workers)**. On older dashboards it is called **Workers & Pages**.
3. Click **joe-portfolio-chat**. Its address is `joe-portfolio-chat.joe-pointer.workers.dev`.
4. To check you're in the right place, click **Edit code**. The code should mention `X-Ask-Joe-Version` and `joepointer.com`.

If you can't find it, or would rather not edit it, invite Mike: **Manage Account > Members > Invite**, enter mpointer@gmail.com, and give him the **Workers Admin** role. He'll do steps 1 to 3.

## 1. Add the secrets

In `joe-portfolio-chat` (found in step 0), go to Settings > Variables and Secrets > Add. You should already see your Anthropic key listed there, which also confirms you're in the right Worker.

| Name | Type | Value |
|---|---|---|
| `ELEVENLABS_API_KEY` | Secret | the key Mike sends you (never paste it into GitHub, email threads, or chat) |
| `ELEVENLABS_VOICE_ID` | Secret | the voice ID Mike sends you with the key (see below) |

Optional: `ELEVENLABS_MODEL` (default `eleven_flash_v2_5`, the fast, cheap one).

Command line alternative: `npx wrangler secret put ELEVENLABS_API_KEY`, then the same for `ELEVENLABS_VOICE_ID`.

**Voice ID.** Mike creates an AI clone of your voice in his ElevenLabs account, the one the key belongs to. A voice only works with a key from the same account. Send him one to two minutes of yourself talking (a phone voice memo in a quiet room is fine), plus a line saying you consent to the clone. He'll send back the key and the voice ID together. The site and the assistant both say the voice is AI.

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
