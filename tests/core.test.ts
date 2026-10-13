import test from 'node:test';
import assert from 'node:assert/strict';
import { chats, seed, stickers, stories } from '../shared/data';
import {
  localAnswer,
  reactionCount,
  retrieve,
  searchMessages,
  stickerStats,
  validSources,
} from '../shared/search';
test('seed meets scale and all references resolve in the correct chat', () => {
  assert.equal(chats.length, 10);
  assert.ok(seed.messages.length >= 1500 && seed.messages.length <= 2500);
  assert.ok(seed.messages.filter((m) => m.chatId === 'group').length >= 1000);
  assert.ok(seed.messages.filter((m) => m.reactions.length).length >= 300);
  assert.ok(seed.messages.filter((m) => m.stickerId).length >= 100);
  assert.equal(stories.length, 15);
  assert.equal(seed.fragments.length, 18);
  assert.equal(new Set(seed.messages.map((m) => m.id)).size, seed.messages.length);
  const index = new Map(seed.messages.map((m) => [m.id, m]));
  for (const m of seed.messages) {
    assert.ok(chats.find((c) => c.id === m.chatId)?.members.includes(m.senderId));
    if (m.replyTo) assert.equal(index.get(m.replyTo)?.chatId, m.chatId);
    if (m.stickerId) assert.ok(stickers.some((s) => s.id === m.stickerId));
  }
  for (const f of seed.fragments) {
    let last = '';
    for (const id of f.messageIds) {
      const m = index.get(id)!;
      assert.ok(m);
      assert.equal(m.chatId, f.chatId);
      assert.ok(m.timestamp >= last);
      last = m.timestamp;
    }
  }
});
test('reaction filters compose and sorting ranks actual reaction totals', () => {
  const found = searchMessages(seed.messages, 'group', {
    reaction: '😂',
    min: 5,
    sort: 'popular',
    sender: 'max',
  });
  assert.ok(found.length);
  assert.ok(
    found.every(
      (m) =>
        m.senderId === 'max' && m.reactions.some((r) => r.emoji === '😂') && reactionCount(m) >= 5,
    ),
  );
  for (let i = 1; i < found.length; i++)
    assert.ok(reactionCount(found[i - 1]) >= reactionCount(found[i]));
  assert.equal(searchMessages(seed.messages, 'group', { reaction: '😂', min: 100 }).length, 0);
});
test('sticker exact matching, emoji and metadata statistics agree', () => {
  const matches = searchMessages(seed.messages, 'group', {
    category: 'stickers',
    stickerId: 'funny2',
  });
  const stats = stickerStats(seed.messages, 'group', 'funny2');
  assert.equal(matches.length, stats.count);
  assert.equal(
    Object.values(stats.users).reduce((a, b) => a + b, 0),
    stats.count,
  );
  assert.ok(matches.every((m) => m.stickerId === 'funny2'));
  assert.deepEqual(
    searchMessages(seed.messages, 'group', { category: 'stickers', query: '🤦' }).map((m) => m.id),
    matches.map((m) => m.id),
  );
  assert.equal(
    searchMessages(seed.messages, 'group', { category: 'stickers', pack: 'nonexistent' }).length,
    0,
  );
});
test('retrieval is bounded, scoped, contextual and not tied to demo prompts', () => {
  for (const q of [
    'How did the frog joke start?',
    'Tell me about Beans and the router',
    'concrete chairs café',
    'Harry Potter characters',
    'summer trip cabin',
  ]) {
    const found = retrieve(seed.messages, 'group', q);
    assert.ok(found.length > 0);
    assert.ok(found.length <= 32);
    assert.ok(found.every((m) => m.chatId === 'group'));
  }
  assert.ok(
    retrieve(seed.messages, 'group', 'Beans router').some((m) => m.text.includes('router')),
  );
  assert.equal(retrieve(seed.messages, 'mia', 'frog').length, 0);
  assert.equal(retrieve(seed.messages, 'group', 'quantum cryptocurrency penguins').length, 0);
  const broad = retrieve(seed.messages, 'group', 'Harry Potter characters');
  assert.ok(new Set(broad.map((m) => m.timestamp.slice(0, 10))).size > 1);
  assert.ok(
    retrieve(seed.messages, 'group', 'How did the frog joke start?').some(
      (m) => m.text === 'there is a frog in my shoe',
    ),
  );
});
test('source validation rejects fabricated, foreign and duplicate IDs', () => {
  const evidence = retrieve(seed.messages, 'group', 'frog');
  assert.deepEqual(
    validSources([evidence[0].id, evidence[0].id, 'fake-1', 'mia-1228', null], evidence),
    [evidence[0].id],
  );
  assert.deepEqual(validSources('wrong shape', evidence), []);
});
test('local answers retain valid citations and refuse absent evidence', () => {
  for (const q of [
    'How did the frog joke start?',
    'What happened on our summer trip?',
    'Which Harry Potter characters are we?',
    'Which sticker do we use the most?',
  ]) {
    const a = localAnswer(seed.messages, 'group', q);
    assert.ok(a.text.length > 0);
    assert.ok(a.sourceIds.length > 0);
    assert.ok(
      a.sourceIds.every((id) => seed.messages.some((m) => m.id === id && m.chatId === 'group')),
    );
  }
  const missing = localAnswer(seed.messages, 'mia', 'frog');
  assert.equal(missing.sourceIds.length, 0);
  assert.match(missing.text, /enough evidence/);
});
