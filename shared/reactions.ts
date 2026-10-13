import type { Message } from './types';

// Demo chats allow one reaction per member, across all emoji badges.
export function limitReactions(
  reactions: Message['reactions'],
  members: number,
): Message['reactions'] {
  let remaining = Math.max(0, Math.floor(members));
  return reactions.flatMap(({ emoji, count }) => {
    const allowed = Number.isFinite(count)
      ? Math.min(remaining, Math.max(0, Math.floor(count)))
      : 0;
    remaining -= allowed;
    return allowed ? [{ emoji, count: allowed }] : [];
  });
}
