import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync } from 'node:fs';
import { EmojiText, emojiParts } from '../src/EmojiText';
import { AnswerMarkdown } from '../src/AnswerMarkdown';
import manifest from '../src/apple-emoji.json';

test('Apple emoji handle hearts, skin tones, ZWJ families, flags and keycaps without losing text', () => {
  const original = 'Hello ❤️ ❤ 👍🏽 👨‍👩‍👧‍👦 🇫🇷 1️⃣!';
  const parts = emojiParts(original);
  assert.equal(parts.map((p) => p.text).join(''), original);
  assert.equal(parts.filter((p) => p.src).length, 6);
  assert.equal(emojiParts('ordinary text').length, 1);
  const html = renderToStaticMarkup(createElement(EmojiText, { text: original }));
  assert.match(html, /class="apple-emoji"/);
  assert.match(html, /alt="👍🏽"/);
  for (const path of Object.values(manifest))
    assert.ok(existsSync('public/emoji/apple/' + path), path);
});
test('AI renders Apple emoji with Markdown while leaving code unchanged', () => {
  const html = renderToStaticMarkup(createElement(AnswerMarkdown, { text: '**Fun 😂** and `😂`' }));
  assert.match(html, /<strong>Fun <img/);
  assert.match(html, /<code>😂<\/code>/);
  assert.match(html, /alt="😂"/);
});
