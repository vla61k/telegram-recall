import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { seed, chats, people } from '../shared/data';
import { limitReactions } from '../shared/reactions';
import { AnswerMarkdown } from '../src/AnswerMarkdown';
import { existsSync } from 'node:fs';

test('all message reaction totals fit chat membership, including private chats', () => {
  for (const m of seed.messages) {
    const members = chats.find((c) => c.id === m.chatId)!.members.length;
    assert.ok(m.reactions.reduce((sum, r) => sum + r.count, 0) <= members, m.id);
  }
  assert.deepEqual(
    limitReactions(
      [
        { emoji: '😂', count: 5 },
        { emoji: '❤️', count: 2 },
      ],
      2,
    ),
    [{ emoji: '😂', count: 2 }],
  );
  assert.deepEqual(
    limitReactions(
      [
        { emoji: '😂', count: 6 },
        { emoji: '❤️', count: 2 },
      ],
      7,
    ),
    [
      { emoji: '😂', count: 6 },
      { emoji: '❤️', count: 1 },
    ],
  );
  assert.deepEqual(limitReactions([{ emoji: '😂', count: 2 }], 0), []);
});
test('AI markdown renders bold, lists, tables and rejects executable markup', () => {
  const html = renderToStaticMarkup(
    createElement(AnswerMarkdown, {
      text: '**Summary**\n\n- First\n- *Second*\n\n| Name | Count |\n| --- | --- |\n| Mia | 2 |\n\n<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)',
    }),
  );
  assert.match(html, /<strong>Summary<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<em>Second<\/em>/);
  assert.match(html, /<table>/);
  assert.doesNotMatch(html, /<script|javascript:|\*\*Summary/);
});
test('every person and chat has a bundled photo avatar', () => {
  for (const item of [...people, ...chats]) assert.ok(existsSync('public' + item.avatar), item.id);
});
