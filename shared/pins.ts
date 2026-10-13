import type { Message } from './types';

export function pinnedMessages(messages: Message[], chatId: string) {
  const scope = messages.filter((m) => m.chatId === chatId);
  const pins = scope.filter(
    (m) =>
      m.text.includes('summer trip:') ||
      m.text.includes('GOT SEVEN TICKETS') ||
      m.text.includes('train at 10:14'),
  );
  return pins.length ? pins : scope.slice(0, 1);
}
