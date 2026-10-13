import { person, stickers, stories } from './data';
import type { Answer, Message } from './types';
export const reactionCount = (m: Message) => m.reactions.reduce((sum, r) => sum + r.count, 0);
export type Filters = {
  query?: string;
  reaction?: string;
  min?: number;
  sender?: string;
  sort?: string;
  stickerId?: string;
  pack?: string;
  category?: string;
};
export function searchMessages(messages: Message[], chatId: string, f: Filters = {}): Message[] {
  const q = (f.query ?? '').toLowerCase().trim();
  return messages
    .filter((m) => {
      const sticker = stickers.find((s) => s.id === m.stickerId);
      const content = [m.text, sticker?.name, sticker?.emoji, ...(sticker?.keywords ?? [])]
        .join(' ')
        .toLowerCase();
      return (
        m.chatId === chatId &&
        (!q || content.includes(q)) &&
        (!f.sender || m.senderId === f.sender) &&
        (!f.reaction ||
          (f.reaction === 'any'
            ? m.reactions.length > 0
            : m.reactions.some((r) => r.emoji === f.reaction))) &&
        reactionCount(m) >= (f.min ?? 0) &&
        (!f.stickerId || m.stickerId === f.stickerId) &&
        (!f.pack || sticker?.pack === f.pack) &&
        (f.category !== 'stickers' || !!m.stickerId)
      );
    })
    .sort((a, b) =>
      f.sort === 'popular'
        ? reactionCount(b) - reactionCount(a) || b.timestamp.localeCompare(a.timestamp)
        : b.timestamp.localeCompare(a.timestamp),
    );
}
const stop = new Set(
  'a an and are as at be by can do did does for from had has have how i in is it me my of on or our that the this to us was we were what when which who why with would you your about most tell'.split(
    ' ',
  ),
);
const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((t) => !stop.has(t)) ?? [];
export function retrieve(
  messages: Message[],
  chatId: string,
  query: string,
  limit = 32,
): Message[] {
  const scope = messages.filter((m) => m.chatId === chatId);
  const q = tokenize(query);
  if (!q.length) return [];
  const synonyms: Record<string, string[]> = {
    funniest: ['funny', 'laugh', 'chaos', 'disaster'],
    funny: ['laugh', 'chaos'],
    roasted: ['Max', 'roast', 'cooking', 'disaster'],
    roast: ['roast', 'cooking', 'disaster'],
    characters: ['potter', 'Hermione', 'Ron', 'Luna', 'Neville'],
    personality: ['potter', 'coffee', 'games', 'summer'],
    joke: ['frog', 'Hops'],
    chaotic: ['cooking', 'karaoke', 'games'],
    trip: ['summer', 'lake', 'cabin'],
    holiday: ['summer', 'lake', 'cabin'],
  };
  const terms = [
    ...new Set(q.flatMap((t) => [t, ...(synonyms[t] ?? []).map((x) => x.toLowerCase())])),
  ];
  const docs = scope.map((m) =>
    tokenize(
      [
        m.text,
        person(m.senderId).name,
        m.story,
        stories.find((s) => s.id === m.story)?.title,
        stickers.find((s) => s.id === m.stickerId)?.keywords.join(' '),
      ].join(' '),
    ),
  );
  const avg = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1);
  const df = new Map(terms.map((t) => [t, docs.filter((d) => d.includes(t)).length]));
  const ranked = scope
    .map((m, i) => {
      const d = docs[i];
      let score = 0;
      for (const t of terms) {
        const tf = d.filter((x) => x === t).length;
        const idf = Math.log(
          1 + (scope.length - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5),
        );
        score += (idf * (tf * 2.2)) / (tf + 1.2 * (0.25 + (0.75 * d.length) / (avg || 1)));
      }
      if (/funni|roast|chaos/.test(query) && score > 0)
        score += Math.min(reactionCount(m) * 0.08, 1);
      return { m, i, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) =>
      /start|beg[ai]n|origin|longest|first/i.test(query)
        ? a.m.timestamp.localeCompare(b.m.timestamp) || b.score - a.score
        : b.score - a.score,
    );
  const selected = new Map<string, Message>();
  const dates = new Map<string, number>();
  for (const { m, i } of ranked) {
    const day = m.timestamp.slice(0, 10);
    if ((dates.get(day) ?? 0) >= 2) continue;
    dates.set(day, (dates.get(day) ?? 0) + 1);
    // Keep adjacent conversation and explicit reply parent; cap the context budget.
    const window = [
      scope[i - 1],
      m,
      scope[i + 1],
      m.replyTo ? scope.find((x) => x.id === m.replyTo) : undefined,
    ].filter((x): x is Message => !!x);
    for (const item of window) {
      if (selected.size < limit) selected.set(item.id, item);
    }
    if (selected.size >= limit) break;
  }
  return [...selected.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
export function stickerStats(messages: Message[], chatId: string, stickerId: string) {
  const found = messages.filter((m) => m.chatId === chatId && m.stickerId === stickerId);
  const users: Record<string, number> = {};
  const months: Record<string, number> = {};
  for (const m of found) {
    users[m.senderId] = (users[m.senderId] ?? 0) + 1;
    const month = m.timestamp.slice(0, 7);
    months[month] = (months[month] ?? 0) + 1;
  }
  return {
    count: found.length,
    users,
    peakMonth: Object.entries(months).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    sourceIds: found.map((m) => m.id),
  };
}
export function validSources(ids: unknown, retrieved: Message[]): string[] {
  const allow = new Set(retrieved.map((m) => m.id));
  return Array.isArray(ids)
    ? [...new Set(ids.filter((id): id is string => typeof id === 'string' && allow.has(id)))].slice(
        0,
        12,
      )
    : [];
}
export function localAnswer(messages: Message[], chatId: string, query: string): Answer {
  const evidence = retrieve(messages, chatId, query);
  const scope = messages.filter((m) => m.chatId === chatId);
  if (/sticker/i.test(query) && /most|favour|frequen|popular/i.test(query)) {
    const stats = stickers
      .map((s) => ({ ...stickerStats(messages, chatId, s.id), sticker: s }))
      .sort((a, b) => b.count - a.count);
    const top = stats[0];
    if (!top?.count)
      return {
        text: 'There are no sticker messages in this conversation yet.',
        sourceIds: [],
        mode: 'local',
      };
    return {
      text:
        '“' +
        top.sticker.name +
        '” ' +
        top.sticker.emoji +
        ' is the most-used sticker in this chat: ' +
        top.count +
        ' sends. ' +
        Object.entries(top.users)
          .sort((a, b) => b[1] - a[1])
          .map(([id, n]) => person(id).name + ' sent it ' + n + ' times')
          .join('; ') +
        '. Its busiest month was ' +
        top.peakMonth +
        '. These counts cover the complete local chat history.',
      sourceIds: top.sourceIds.slice(-4),
      mode: 'local',
    };
  }
  if (!evidence.length)
    return {
      text: 'I couldn’t find enough evidence in this conversation to answer that. Try a name, a place, or a phrase someone used.',
      sourceIds: [],
      mode: 'local',
    };
  const ordered = [...evidence].filter((m) => m.text);
  let selected = ordered;
  let intro =
    'Here are the closest passages I found in this conversation. This is a local evidence summary, not a generated AI interpretation.';
  if (/potter|character|personality/i.test(query)) {
    selected = ordered.filter((m) => /Hermione|Ron|Neville|Luna|Snape|Molly|Rita/i.test(m.text));
    intro =
      'A playful reading, not a personality assessment. The chat already made a few comparisons:';
  } else if (/funni|roast|chaotic/i.test(query)) {
    selected = ordered.sort((a, b) => reactionCount(b) - reactionCount(a));
    intro =
      'These matching moments got the biggest reactions. Reactions are a useful clue, but they don’t prove who is funniest or gets roasted most.';
  } else if (/longest|start|beg[ai]n|origin/i.test(query)) {
    selected = ordered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    intro =
      'The earliest matching passages I found are below. This shows evidence from the available history, not proof that no earlier joke existed.';
  }
  if (!selected.length) selected = ordered;
  // Diversify quote excerpts by scene/date, preserving original provenance.
  const picks: Message[] = [];
  const seen = new Set<string>();
  for (const m of selected) {
    const key = m.timestamp.slice(0, 10);
    if (seen.has(key) && picks.length >= 2) continue;
    picks.push(m);
    seen.add(key);
    if (picks.length === 5) break;
  }
  if (!picks.length)
    return {
      text: 'I found related activity, but not enough written evidence to answer this question.',
      sourceIds: [],
      mode: 'local',
    };
  return {
    text:
      intro +
      '\n\n' +
      picks
        .map(
          (m) =>
            '**' +
            person(m.senderId).name +
            ' · ' +
            new Date(m.timestamp).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              timeZone: 'UTC',
            }) +
            '**\n“' +
            m.text +
            '”',
        )
        .join('\n\n') +
      '\n\nBased on ' +
      evidence.length +
      ' retrieved messages from ' +
      scope.length +
      ' in this chat.',
    sourceIds: picks.map((m) => m.id),
    mode: 'local',
  };
}
