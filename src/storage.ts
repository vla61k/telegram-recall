import { limitReactions } from '../shared/reactions';
import { openDB } from 'idb';
import { chats, seed } from '../shared/data';
import type { Database } from '../shared/types';
const db = openDB('telegram-recall', 1, {
  upgrade(db) {
    db.createObjectStore('state');
  },
});
export async function loadData(): Promise<Database> {
  const saved = await (await db).get('state', 'demo');
  if (saved?.version !== seed.version) return structuredClone(seed);
  // Seed records are immutable. Refresh them as the demo evolves, while retaining
  // all browser-authored messages, edited/deleted fragments and their stable IDs.
  const originalIds = new Set(seed.messages.map((message) => message.id));
  const messages = [
    ...structuredClone(seed.messages),
    ...saved.messages.filter(
      (message: Database['messages'][number]) => !originalIds.has(message.id),
    ),
  ];
  for (const message of messages) {
    message.reactions = limitReactions(
      message.reactions,
      chats.find((c) => c.id === message.chatId)?.members.length ?? 0,
    );
  }
  const index = new Map(messages.map((message) => [message.id, message]));
  return {
    ...saved,
    messages,
    fragments: saved.fragments.map((fragment: Database['fragments'][number]) => ({
      ...fragment,
      participants: [
        ...new Set(fragment.messageIds.map((id) => index.get(id)?.senderId).filter(Boolean)),
      ],
    })),
  };
}
export async function persistData(value: Database) {
  await (await db).put('state', value, 'demo');
}
export async function resetData() {
  const fresh = structuredClone(seed);
  await persistData(fresh);
  return fresh;
}
