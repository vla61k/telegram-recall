# Validation — 13 October 2026

## Automated

- Strict TypeScript checking and Vite production build: passed.
- Twelve Node test cases: passed.
- Dataset: 10 chats, 2,091 messages, 1,227 in the main chat, 698 reacted messages, 136 sticker messages, 18 seed Fragments, 15 storylines.
- Reaction search: emoji, minimum total reaction count, sender and popularity sorting compose correctly.
- Sticker search: exact ID, emoji, keyword and pack filtering; usage totals match actual records.
- Retrieval: bounded context, current-chat scope, varied dates, reply/neighbor context, and early-message priority for origin questions.
- Citation validation: rejects missing, duplicated, foreign and fabricated message IDs.
- Streaming API: tested against a local mock provider with a split SSE frame; input validation and fabricated citation removal verified.
- Dependency audit during installation: no reported vulnerabilities.

- Reaction totals are capped by chat membership across emoji badges; private chats have at most two reactions per message. Existing local records are normalized on load.
- Markdown rendering: bold, emphasis, lists, GFM tables, and unsafe markup handling are covered by tests.
- All photo avatar paths resolve to bundled assets; provenance is in public/avatars/CREDITS.md.

## Browser

- Verified the combined Saved tab and shared search across pins and Fragments.
- Verified photo images load and AI answers contain real strong elements without raw Markdown markers.
- Verified Saved and AI layouts at 390 × 844 without horizontal overflow.
- Opened the desktop chat and visually reviewed it.
- Applied reaction filters, opened an actual result, verified its position in the visible chat, and returned to the same filter URL.
- Opened the supplied sticker gallery and verified per-sticker use counts.
- Generated a local evidence answer and opened the source message.
- Used the right-click menu to select a three-message range and save a named Fragment.
- Reloaded the page and verified the Fragment persisted; edited its title successfully.
- Reviewed mobile layouts at 390 × 844 and checked the dark theme.
- Fixed opening the main chat from the mobile list so it scrolls to the latest messages.
- Browser testing used localhost storage, separate from the user's 127.0.0.1 demo.
- Screenshots are in test-results/ (excluded from source packaging).

## Not verified or not implemented

- No paid or live AI provider was called; no real API key was available. The adapter was tested with a local mock.
- Touch long-press is implemented, but was not exercised on a physical iPhone.
- No Telegram account integration, billing, real calling, contacts app, or multi-user synchronization.
- The supplied stickers are static WebP; no animated assets were supplied.
- No reference screenshot was supplied for pixel-by-pixel comparison.
- Publishing was blocked by automatic approval review before source upload. A private Sites project was registered, but no source version was pushed or deployed.
- No GitHub repository was created.

## Apple Emoji update

- Bundled 3,783 Apple emoji images with Unicode and skin-tone mapping.
- Messages, reactions, search filters, Fragments, category choices, and AI Markdown use local images.
- Unicode remains unchanged in storage, filtering, and explicit copy actions. Native text-entry fields retain the system font while typing.
- Tests cover variation selectors, skin tones, ZWJ sequences, flags, keycaps, and Markdown code preservation.
- Source and image rights are documented in public/emoji/CREDITS.md.
