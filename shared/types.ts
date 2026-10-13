export type Person = { id: string; name: string; color: string; avatar: string };
export type Reaction = { emoji: string; count: number };
export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
  reactions: Reaction[];
  replyTo?: string;
  stickerId?: string;
  story?: string;
};
export type Chat = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  members: string[];
  unread: number;
  pinned?: boolean;
  description: string;
};
export type Sticker = {
  id: string;
  name: string;
  emoji: string;
  keywords: string[];
  pack: string;
  src: string;
};
export type Fragment = {
  id: string;
  chatId: string;
  messageIds: string[];
  title: string;
  description: string;
  category: string;
  createdAt: string;
  participants: string[];
};
export type Database = { version: number; messages: Message[]; fragments: Fragment[] };
export type Answer = { text: string; sourceIds: string[]; mode: 'local' | 'provider' };
