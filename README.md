# Telegram Recall

An interactive, independent Telegram iOS design exploration. Search reactions, rediscover stickers, save conversation Fragments, and ask questions with verifiable message sources.

All demo conversations are fictional. This project is not affiliated with Telegram.

## Run

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The optional API runs on port 3001.

```sh
npm test
npm run build
npm start
```

The production server serves the built app and API at **http://127.0.0.1:3001**.

## Try the concept

1. Open **The Group Chat**.
2. Choose **Reactions**, select 😂, choose **Most reacted**, and open a result. It scrolls to the real message and highlights it; **Back to results** restores the filters.
3. Choose **Stickers** and select one of the three supplied WebP assets. Filter by emoji, keyword, pack or sender. Each occurrence includes context, with usage statistics above.
4. Right-click a message (or hold on touch) → **Save Fragment**. Select another message to include the consecutive range, then give it a title. Fragments appear in the chat's **Info → Saved** tab.
5. Open **Ask AI** and try “How did the frog joke start?” or “Which sticker do we use the most?”. Open a source and return to the answer.
6. Open **Settings** for appearance, AI mode, dataset counts, and a confirmed reset.

Contacts and Calls are intentionally disabled; they are present only to retain the Telegram tab-bar structure.

## AI modes

**Local evidence** works completely in the browser without credentials. It uses the shared retrieval pipeline, quotes actual messages, computes sticker statistics, and explicitly identifies itself as a local evidence summary. It does not impersonate a language model. Text is progressively revealed for the interactive experience.

**Connected AI** uses an OpenAI-compatible chat-completions streaming endpoint. Copy .env.example to .env, set OPENAI_API_KEY, OPENAI_BASE_URL, and OPENAI_MODEL, then restart the server. Choose Connected AI in Settings. Credentials never enter the browser. Live provider behavior requires a key and is not included in the static hosted demo.

The server retrieves up to 32 messages using BM25-style lexical relevance, query normalization, a small synonym dictionary, storyline metadata, varied dates, neighboring messages and reply relationships. Sticker metadata and aggregate statistics are included. It does not send the entire history. Conversation content is explicitly untrusted. Provider citation IDs are validated against the retrieved set; invalid references never become links. An answer without a valid source is replaced by an uncertainty message.

Connected AI analyzes the original seed dataset. Browser-added messages participate in local search and Local evidence, and are not silently uploaded. Generation supports cancellation, a 60-second timeout, errors, retry and copying.

## Dataset and persistence

- 10 conversations; 2,091 messages.
- 1,227 messages and 7 people in The Group Chat.
- More than 300 reacted messages; 136 sticker messages.
- 15 storylines, each with a beginning and later callbacks.
- 18 initial Fragments.
- Three original supplied WebP stickers in stickers/, served from public/stickers/.

Stories are hand-authored fictional scenes with deterministic ambient conversation generation. Stable message IDs are shared by client and server. Fragments store ordered message references, original-chat ID, title, description, category, creation time and participants. Original dates are resolved through message references.

IndexedDB stores locally added messages and Fragments. Appearance and AI mode use localStorage. There is no multi-user synchronization or Telegram login. Reset restores the seed and requires confirmation.

## Architecture

```text
src/             React app, iOS-style responsive CSS, IndexedDB storage
shared/data.ts   Fictional conversation generator and sticker catalog
shared/search.ts Filters, retrieval, local evidence, citation validation
shared/types.ts  Shared TypeScript data contracts
server/index.ts  Express API, streaming provider adapter, production server
tests/           Dataset, search, retrieval and citation integrity tests
public/          Original supplied stickers
```

React Router uses hash routes so the app can be hosted on a static server without rewrite rules. The desktop layout presents a two-pane messenger; narrow screens use single-screen iOS navigation. Both day and night themes work.

## Deployment and GitHub

The build produces dist/, which can be deployed to static hosting. All core demo features and Local evidence work on static hosting. To enable Connected AI, deploy the Node server and set server-side environment variables. Put a publicly reachable AI API behind authentication and request limits before enabling paid credentials; the included server binds to localhost by default.

Source files and a lockfile are ready for a GitHub repository. Secrets, dependencies, build output, caches and test artifacts are ignored. No GitHub repository is automatically created. The supplied sticker artwork remains the property of its respective authors; do not assume the code grants redistribution rights to those assets.

## Validation and limits

Run npm test for dataset scale, reference integrity, composable reaction/sticker filtering, statistics, retrieval scope/context and invalid-citation rejection. Run npm run build for strict TypeScript checks and production compilation.

This is a proposal, not a Telegram client. Stars are a labeled concept; there is no billing. The three provided stickers are static WebP files. Avatars use local emoji artwork. The requested reference screenshot was not supplied, so the design uses established iOS Telegram patterns rather than a pixel comparison with that screenshot. Supplemental chats and everyday background activity use reusable conversation templates.
