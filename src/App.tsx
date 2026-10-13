import { EmojiText } from './EmojiText';
import { AnswerMarkdown } from './AnswerMarkdown';
import { pinnedMessages } from '../shared/pins';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BatteryFull,
  Bookmark,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Ellipsis,
  Info,
  MessageCircle,
  Moon,
  Phone,
  Pin,
  Search,
  Settings,
  Signal,
  Smile,
  Sparkles,
  SquarePen,
  Star,
  Sun,
  Trash2,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { chats, person, seed, stickers } from '../shared/data';
import { localAnswer, searchMessages, stickerStats } from '../shared/search';
import type { Answer, Chat, Database, Fragment, Message } from '../shared/types';
import { loadData, persistData, resetData } from './storage';

const day = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
const shortDay = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const time = (date: string) =>
  new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
type AppContextType = {
  data: Database;
  update: (d: Database) => void;
  notice: (s: string) => void;
  theme: string;
  setTheme: (s: string) => void;
  aiMode: string;
  setAiMode: (s: string) => void;
  context: (m: Message) => void;
  select: (m: Message) => void;
  jump: (m: Message) => void;
};
const AppContext = createContext<AppContextType>(null!);
const useApp = () => useContext(AppContext);
function Avatar({ src, color, size = 48 }: { src: string; color: string; size?: number }) {
  return (
    <span
      className="avatar"
      style={
        {
          '--avatar-color': color,
          width: size,
          height: size,
          fontSize: size * 0.5,
        } as CSSProperties
      }
    >
      <img src={src} alt="" decoding="async" />
    </span>
  );
}
function IconButton({
  label,
  children,
  onClick,
  className = '',
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      className={'icon-button ' + className}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Empty({
  icon = <Search size={32} />,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const node = ref.current;
    node?.querySelector<HTMLElement>('input,button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && node) {
        const all = [
          ...node.querySelectorAll<HTMLElement>('button,input,textarea,select,[tabindex="0"]'),
        ];
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      old?.focus();
    };
  }, []);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <header>
          <h2>{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [data, setData] = useState<Database>(structuredClone(seed));
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState(localStorage.getItem('recall-theme') || 'light');
  const [aiMode, setAiModeState] = useState(localStorage.getItem('recall-ai') || 'local');
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState<Message | null>(null);
  const [selection, setSelection] = useState<{ chatId: string; start: string; end: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('💬');
  const navigate = useNavigate();
  const location = useLocation();
  const parts = location.pathname.split('/');
  const chatId = parts[1] === 'chat' ? parts[2] : 'group';
  const view = parts[3] || 'conversation';
  const chat = chats.find((c) => c.id === chatId) ?? chats[0];
  const settings = parts[1] === 'settings';
  useEffect(() => {
    loadData()
      .then(setData)
      .catch(() => setToast('Local storage is unavailable. Changes will last for this session.'))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('recall-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    if (selection && selection.chatId !== chat.id) setSelection(null);
  }, [chat.id]);
  const update = (next: Database) => {
    setData(next);
    persistData(next).catch(() => setToast('Could not save changes on this device.'));
  };
  const jump = (m: Message) =>
    navigate('/chat/' + m.chatId + '?message=' + m.id, {
      state: { from: location.pathname + location.search },
    });
  const select = (m: Message) => {
    setSelection({ chatId: m.chatId, start: m.id, end: m.id });
    setMenu(null);
    navigate('/chat/' + m.chatId + '?message=' + m.id);
  };
  const scope = data.messages.filter((m) => m.chatId === (selection?.chatId || chat.id));
  const a = scope.findIndex((m) => m.id === selection?.start),
    b = scope.findIndex((m) => m.id === selection?.end);
  const selected = selection ? scope.slice(Math.min(a, b), Math.max(a, b) + 1) : [];
  const saveFragment = (e: FormEvent) => {
    e.preventDefault();
    if (!selected.length) return;
    const f: Fragment = {
      id: crypto.randomUUID(),
      chatId: chat.id,
      messageIds: selected.map((m) => m.id),
      title: title.trim() || 'Untitled fragment',
      description: description.trim(),
      category,
      createdAt: new Date().toISOString(),
      participants: [...new Set(selected.map((m) => m.senderId))],
    };
    update({ ...data, fragments: [f, ...data.fragments] });
    setSaving(false);
    setSelection(null);
    setTitle('');
    setDescription('');
    setToast('Fragment saved on this device');
    navigate('/chat/' + chat.id + '/fragment/' + f.id);
  };
  return (
    <AppContext.Provider
      value={{
        data,
        update,
        notice: setToast,
        theme,
        setTheme: setThemeState,
        aiMode,
        setAiMode: (s) => {
          setAiModeState(s);
          localStorage.setItem('recall-ai', s);
        },
        context: setMenu,
        select,
        jump,
      }}
    >
      <div className="page">
        <header className="project-header">
          <Link to="/chat/group" className="wordmark">
            <span className="telegram-logo">
              <svg viewBox="0 0 24 24">
                <path d="m4 11 16-6-3 15-5-4-3 3v-5l8-6-10 5z" fill="currentColor" />
              </svg>
            </span>
            <strong>
              Telegram <span>Recall</span>
            </strong>
            <span className="concept-tag">A design exploration</span>
          </Link>
          <div className="project-actions">
            <span className="local-indicator" />
            Interactive prototype
            <IconButton
              label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              onClick={() => setThemeState(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </IconButton>
          </div>
        </header>
        <main className={'app-window ' + (location.pathname === '/' ? 'show-list' : 'show-chat')}>
          <aside className="sidebar">
            <div className="ios-status">
              <b>9:41</b>
              <span>
                <Signal size={15} />
                <Wifi size={15} />
                <BatteryFull size={21} />
              </span>
            </div>
            <ChatList active={settings ? '' : chat.id} />
            <TabBar settings={settings} />
          </aside>
          <section className="detail">
            <div className="mobile-status">
              <b>9:41</b>
              <span>
                <Signal size={15} />
                <Wifi size={15} />
                <BatteryFull size={21} />
              </span>
            </div>
            {!ready ? (
              <Empty title="Opening your conversations…">Just a moment.</Empty>
            ) : settings ? (
              <SettingsView />
            ) : view === 'search' ? (
              <SearchView chat={chat} />
            ) : view === 'info' ? (
              <InfoView chat={chat} />
            ) : view === 'fragment' ? (
              <FragmentView id={parts[4]} chat={chat} />
            ) : (
              <Conversation
                chat={chat}
                selected={selected.map((m) => m.id)}
                onSelect={(m) => selection && setSelection({ ...selection, end: m.id })}
                selecting={!!selection}
                cancelSelection={() => setSelection(null)}
                saveSelection={() => {
                  setSaving(true);
                  setTitle('');
                }}
              />
            )}
          </section>
        </main>
        <footer className="project-footer">
          <span>Some conversations are worth finding again.</span>
          <span>
            Fictional chats · Local demo · Not affiliated with Telegram{' '}
            <span className="footer-dot">✦</span>
          </span>
        </footer>
      </div>
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {menu && (
        <Modal title="Message" onClose={() => setMenu(null)}>
          <div className="context-preview">
            <b style={{ color: person(menu.senderId).color }}>{person(menu.senderId).name}</b>
            <p>
              <EmojiText
                text={
                  menu.text || 'Sticker · ' + stickers.find((s) => s.id === menu.stickerId)?.name
                }
              />
            </p>
          </div>
          <div className="action-list">
            <button onClick={() => select(menu)}>
              <Bookmark size={20} />
              Save Fragment
              <ChevronRight size={17} />
            </button>
            {menu.stickerId && (
              <button
                onClick={() => {
                  navigate(
                    '/chat/' + menu.chatId + '/search?tab=stickers&sticker=' + menu.stickerId,
                  );
                  setMenu(null);
                }}
              >
                <Smile size={20} />
                Find Messages with This Sticker
              </button>
            )}
            {menu.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => {
                  navigate(
                    '/chat/' +
                      menu.chatId +
                      '/search?tab=reactions&reaction=' +
                      encodeURIComponent(r.emoji),
                  );
                  setMenu(null);
                }}
              >
                <span>
                  <EmojiText text={r.emoji} />
                </span>
                Find Messages with <EmojiText text={r.emoji} />
              </button>
            ))}
            <button
              onClick={() => {
                navigator.clipboard
                  .writeText(menu.text || 'Sticker')
                  .then(() => setToast('Copied'))
                  .catch(() => setToast('Clipboard unavailable'));
                setMenu(null);
              }}
            >
              <Copy size={20} />
              Copy Text
            </button>
          </div>
        </Modal>
      )}
      {saving && (
        <Modal title="Save Fragment" onClose={() => setSaving(false)}>
          <form onSubmit={saveFragment} className="fragment-form">
            <p className="form-note">
              {selected.length} messages · {selected.length ? shortDay(selected[0].timestamp) : ''}
              <br />
              Their original context, kept together.
            </p>
            <label>
              Title
              <input
                autoFocus
                placeholder="Give this moment a name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={90}
              />
            </label>
            <label>
              Description <span>optional</span>
              <textarea
                placeholder="A little context for later"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={400}
              />
            </label>
            <fieldset className="fragment-categories">
              <legend>Category</legend>
              <div>
                {[
                  ['💬', 'A moment'],
                  ['😂', 'Inside joke'],
                  ['✈️', 'Travel'],
                  ['💡', 'Decision'],
                  ['❤️', 'Favourite'],
                ].map(([emoji, label]) => (
                  <button
                    type="button"
                    key={emoji}
                    aria-pressed={category === emoji}
                    onClick={() => setCategory(emoji)}
                  >
                    <EmojiText text={emoji} />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="primary" type="submit">
              Save {selected.length} messages
            </button>
            <p className="fine-print">
              Saved only on this device. Original messages stay in the chat.
            </p>
          </form>
        </Modal>
      )}
    </AppContext.Provider>
  );
}
function ChatList({ active }: { active: string }) {
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const visible = [...chats]
    .sort(
      (a, b) =>
        Number(!!b.pinned) - Number(!!a.pinned) ||
        (data.messages.filter((m) => m.chatId === b.id).at(-1)?.timestamp || '').localeCompare(
          data.messages.filter((m) => m.chatId === a.id).at(-1)?.timestamp || '',
        ),
    )
    .filter(
      (c) =>
        (!query ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          data.messages.some(
            (m) => m.chatId === c.id && m.text.toLowerCase().includes(query.toLowerCase()),
          )) &&
        (filter !== 'unread' || c.unread > 0),
    );
  return (
    <>
      <div className="list-heading">
        <span className="eyebrow">YOUR CONVERSATIONS</span>
        <div>
          <h1>Chats</h1>
          <IconButton
            label="Search conversations"
            onClick={() => document.getElementById('chat-search')?.focus()}
          >
            <SquarePen size={23} />
          </IconButton>
        </div>
      </div>
      <label className="search-field list-search">
        <Search size={18} />
        <input
          id="chat-search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button aria-label="Clear search" onClick={() => setQuery('')}>
            <X size={15} />
          </button>
        )}
      </label>
      <div className="chat-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All Chats <span>{chats.filter((c) => c.unread > 0).length}</span>
        </button>
        <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>
          Unread
        </button>
      </div>
      <div className="chat-list">
        {visible.map((c) => {
          const last = data.messages.filter((m) => m.chatId === c.id).at(-1)!;
          return (
            <button
              className={'chat-row ' + (active === c.id ? 'selected' : '')}
              key={c.id}
              onClick={() => navigate('/chat/' + c.id)}
            >
              <Avatar src={c.avatar} color={c.color} />
              <span className="chat-row-body">
                <span className="chat-row-title">
                  <strong>{c.name}</strong>
                  <time>
                    {last.timestamp.slice(0, 10) === '2026-10-13'
                      ? time(last.timestamp)
                      : shortDay(last.timestamp)}
                  </time>
                </span>
                <span className="chat-preview">
                  {last.senderId === 'alex' && <CheckCheck size={15} />}
                  <span>
                    <EmojiText text={last.text || 'Sticker'} />
                  </span>
                </span>
                <span className="chat-row-meta">
                  {c.id === 'group' ? (
                    <span className="recall-label">
                      <Sparkles size={11} /> Recall ready
                    </span>
                  ) : (
                    <span />
                  )}
                  <span>
                    {c.pinned && <Pin size={12} fill="currentColor" />}
                    {c.unread > 0 && <b className="unread">{c.unread}</b>}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
        {!visible.length && (
          <Empty title="No conversations found">Try another name or message.</Empty>
        )}
        <p className="list-end">Your memories, all in one place.</p>
      </div>
    </>
  );
}
function TabBar({ settings }: { settings: boolean }) {
  return (
    <nav className="tabbar" aria-label="Main navigation">
      <button disabled title="Contacts is outside this prototype">
        <Users />
        <span>Contacts</span>
      </button>
      <button disabled title="Calls is outside this prototype">
        <Phone />
        <span>Calls</span>
      </button>
      <Link className={!settings ? 'active' : ''} to="/">
        <MessageCircle fill={!settings ? 'currentColor' : 'none'} />
        <span>Chats</span>
      </Link>
      <Link className={settings ? 'active' : ''} to="/settings">
        <Settings />
        <span>Settings</span>
      </Link>
    </nav>
  );
}
function ChatHeader({ chat }: { chat: Chat }) {
  return (
    <header className="chat-header">
      <Link to="/" className="back-link" aria-label="Back to chats">
        <ChevronLeft />
        <span>Chats</span>
      </Link>
      <Link to={'/chat/' + chat.id + '/info'} className="chat-identity">
        <Avatar src={chat.avatar} color={chat.color} size={40} />
        <span>
          <strong>{chat.name}</strong>
          <small>
            {chat.members.length > 2 ? chat.members.length + ' members' : 'last seen recently'}
          </small>
        </span>
      </Link>
      <div className="header-actions">
        <Link
          className="icon-button"
          aria-label="Search this chat"
          title="Search this chat"
          to={'/chat/' + chat.id + '/search'}
        >
          <Search size={23} />
        </Link>
        <Link
          className="icon-button"
          aria-label="Chat information"
          to={'/chat/' + chat.id + '/info'}
        >
          <Ellipsis size={24} />
        </Link>
      </div>
    </header>
  );
}
function MessageBubble({
  message,
  compact = false,
  selected = false,
  onSelect,
}: {
  message: Message;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (m: Message) => void;
}) {
  const { data, context, jump } = useApp();
  const navigate = useNavigate();
  const p = person(message.senderId);
  const self = message.senderId === 'alex';
  const sticker = stickers.find((s) => s.id === message.stickerId);
  const reply = data.messages.find((m) => m.id === message.replyTo);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (hold.current) clearTimeout(hold.current);
  };
  useEffect(() => () => clear(), []);
  return (
    <div
      id={compact ? undefined : 'message-' + message.id}
      data-message-id={message.id}
      className={'message-row ' + (self ? 'outgoing ' : '') + (selected ? 'selected-message' : '')}
    >
      {!self && <Avatar src={p.avatar} color={p.color} size={27} />}
      <div
        className={'bubble ' + (sticker ? 'sticker-bubble' : '')}
        onContextMenu={(e) => {
          e.preventDefault();
          context(message);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') hold.current = setTimeout(() => context(message), 550);
        }}
        onPointerUp={clear}
        onPointerCancel={clear}
        onPointerMove={clear}
        onClick={() => onSelect?.(message)}
      >
        {!self && (
          <span className="sender" style={{ color: p.color }}>
            {p.name}
          </span>
        )}
        {reply && (
          <button
            className="reply-preview"
            onClick={(e) => {
              e.stopPropagation();
              jump(reply);
            }}
          >
            <b>{person(reply.senderId).name}</b>
            <span>
              <EmojiText text={reply.text || 'Sticker'} />
            </span>
          </button>
        )}
        {sticker ? (
          <img className="sticker-art" src={sticker.src} alt={sticker.name} draggable={false} />
        ) : (
          <p>
            <EmojiText text={message.text} />
          </p>
        )}
        <span className="message-time">
          {time(message.timestamp)}
          {self && <CheckCheck size={15} />}
        </span>
        {!!message.reactions.length && (
          <div className="reactions">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                title={'Find messages with ' + r.emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(
                    '/chat/' +
                      message.chatId +
                      '/search?tab=reactions&reaction=' +
                      encodeURIComponent(r.emoji),
                  );
                }}
              >
                <EmojiText text={r.emoji} />
                <b>{r.count}</b>
              </button>
            ))}
          </div>
        )}
      </div>
      {onSelect ? (
        <button
          className={'select-check ' + (selected ? 'checked' : '')}
          aria-label={'Select through message from ' + p.name}
          onClick={() => onSelect(message)}
        >
          {selected && <Check size={15} />}
        </button>
      ) : (
        <IconButton
          className="message-menu"
          label={'Actions for message from ' + p.name}
          onClick={() => context(message)}
        >
          <Ellipsis size={17} />
        </IconButton>
      )}
    </div>
  );
}
function Conversation({
  chat,
  selected,
  selecting,
  onSelect,
  cancelSelection,
  saveSelection,
}: {
  chat: Chat;
  selected: string[];
  selecting: boolean;
  onSelect: (m: Message) => void;
  cancelSelection: () => void;
  saveSelection: () => void;
}) {
  const { data, update, notice, jump } = useApp();
  const [params] = useSearchParams();
  const target = params.get('message');
  const location = useLocation();
  const navigate = useNavigate();
  const messages = useMemo(
    () => data.messages.filter((m) => m.chatId === chat.id),
    [data.messages, chat.id],
  );
  const [draft, setDraft] = useState('');
  const [stickerPicker, setStickerPicker] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const node = target ? document.getElementById('message-' + target) : null;
      if (node) {
        node.scrollIntoView({ block: 'center' });
        node.classList.remove('highlight');
        void node.offsetWidth;
        node.classList.add('highlight');
      } else if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
    }, 50);
    return () => clearTimeout(timer);
  }, [chat.id, target, messages.length, location.pathname]);
  const send = (stickerId?: string) => {
    if (!draft.trim() && !stickerId) return;
    const m: Message = {
      id: 'local-' + crypto.randomUUID(),
      chatId: chat.id,
      senderId: 'alex',
      text: stickerId ? '' : draft.trim(),
      timestamp: new Date().toISOString(),
      reactions: [],
      stickerId,
    };
    update({ ...data, messages: [...data.messages, m] });
    setDraft('');
    setStickerPicker(false);
    notice('Message added to your local demo');
  };
  const pin = pinnedMessages(messages, chat.id)[0];
  return (
    <>
      <ChatHeader chat={chat} />
      <div className="recall-shortcuts">
        <Link to={'/chat/' + chat.id + '/search?tab=reactions'}>
          <Smile size={16} />
          Reactions
        </Link>
        <Link to={'/chat/' + chat.id + '/search?tab=stickers'}>
          <span className="sticker-mini">◩</span>Stickers
        </Link>
        <Link to={'/chat/' + chat.id + '/info'}>
          <Bookmark size={15} />
          Saved
        </Link>
        <Link to={'/chat/' + chat.id + '/search?tab=ai'}>
          <Sparkles size={16} />
          Ask AI
          <span className="new-dot" />
        </Link>
      </div>
      <button className="pinned-bar" onClick={() => jump(pin)}>
        <span className="pin-line" />
        <span>
          <b>Pinned Message</b>
          <span>
            <EmojiText text={pin.text} />
          </span>
        </span>
        <Pin size={17} />
      </button>
      {target && location.state?.from && (
        <button className="return-bar" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />
          Back to results
        </button>
      )}
      <div className="conversation wallpaper" ref={scroll}>
        <div className="history-beginning">
          This is the beginning of your fictional chat history.
        </div>
        {messages.map((m, i) => (
          <div key={m.id}>
            {(!i || messages[i - 1].timestamp.slice(0, 10) !== m.timestamp.slice(0, 10)) && (
              <div className="date-divider">
                <span>{day(m.timestamp)}</span>
              </div>
            )}
            <MessageBubble
              message={m}
              selected={selected.includes(m.id)}
              onSelect={selecting ? onSelect : undefined}
            />
          </div>
        ))}
        <div className="conversation-bottom" />
      </div>
      <button
        className="jump-bottom"
        aria-label="Jump to latest messages"
        onClick={() =>
          scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' })
        }
      >
        <ArrowDown size={19} />
      </button>
      {selecting ? (
        <div className="selection-toolbar">
          <button onClick={cancelSelection}>Cancel</button>
          <span>{selected.length} selected</span>
          <button className="strong" onClick={saveSelection}>
            Save Fragment
          </button>
          <small>Tap another message to select a consecutive range.</small>
        </div>
      ) : (
        <div className="composer-area">
          {stickerPicker && (
            <div className="composer-stickers">
              <span>YOUR STICKERS</span>
              <div>
                {stickers.map((s) => (
                  <button key={s.id} onClick={() => send(s.id)} aria-label={'Send ' + s.name}>
                    <img src={s.src} alt={s.name} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <IconButton label="Choose a sticker" onClick={() => setStickerPicker(!stickerPicker)}>
              <Smile size={25} />
            </IconButton>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message"
              aria-label="Message"
              maxLength={4000}
            />
            <button
              type="submit"
              aria-label="Send message"
              className="send-button"
              disabled={!draft.trim()}
            >
              <ArrowUp size={21} />
            </button>
          </form>
          <div className="home-indicator" />
        </div>
      )}
    </>
  );
}
const searchTabs = [
  ['messages', 'Messages'],
  ['reactions', 'Reactions'],
  ['stickers', 'Stickers'],
  ['ai', 'Ask AI'],
];
function SearchView({ chat }: { chat: Chat }) {
  const { data } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'messages';
  const query = params.get('q') || '',
    reaction = params.get('reaction') || 'any',
    stickerId = params.get('sticker') || '',
    sort = params.get('sort') || 'newest',
    sender = params.get('sender') || '',
    min = Number(params.get('min') || 0),
    pack = params.get('pack') || '';
  const filterRef = useRef(params);
  useEffect(() => {
    filterRef.current = params;
  }, [params]);
  const set = (key: string, value: string) => {
    const n = new URLSearchParams(filterRef.current);
    value ? n.set(key, value) : n.delete(key);
    filterRef.current = n;
    setParams(n, { replace: true });
  };
  const results = searchMessages(data.messages, chat.id, {
    query,
    category: tab,
    reaction: tab === 'reactions' ? reaction : undefined,
    min: tab === 'reactions' ? min : 0,
    sort,
    sender,
    stickerId: tab === 'stickers' ? stickerId : undefined,
    pack: tab === 'stickers' ? pack : undefined,
  });
  const [limit, setLimit] = useState(40);
  useEffect(() => setLimit(40), [params.toString()]);
  const emojis = [
    ...new Set(
      data.messages
        .filter((m) => m.chatId === chat.id)
        .flatMap((m) => m.reactions.map((r) => r.emoji)),
    ),
  ];
  const gallery = stickers.filter(
    (s) =>
      data.messages.some((m) => m.chatId === chat.id && m.stickerId === s.id) &&
      (!pack || s.pack === pack) &&
      (!query ||
        [s.name, s.emoji, ...s.keywords].join(' ').toLowerCase().includes(query.toLowerCase())),
  );
  const stats = stickerId ? stickerStats(data.messages, chat.id, stickerId) : null;
  return (
    <>
      <header className="screen-header">
        <Link to={'/chat/' + chat.id} className="back-link">
          <ChevronLeft />
          Back
        </Link>
        <div>
          <strong>Search</strong>
          <small>{chat.name}</small>
        </div>
        <Link to={'/chat/' + chat.id + '/info'} className="icon-button" aria-label="Chat info">
          <Info size={22} />
        </Link>
      </header>
      <div className="search-tabs" role="tablist">
        {searchTabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setParams({ tab: id })}
          >
            {id === 'ai' && <Sparkles size={16} />} {label}
          </button>
        ))}
      </div>
      {tab === 'ai' ? (
        <AIView chat={chat} />
      ) : (
        <>
          <div className="search-controls">
            <label className="search-field">
              <Search size={18} />
              <input
                autoFocus={tab === 'messages'}
                placeholder={tab === 'stickers' ? 'Search by emoji or keyword' : 'Search messages'}
                value={query}
                onChange={(e) => set('q', e.target.value)}
              />
              {query && (
                <button aria-label="Clear query" onClick={() => set('q', '')}>
                  <X size={16} />
                </button>
              )}
            </label>
            {tab === 'reactions' && (
              <>
                <div className="reaction-chips">
                  <button
                    className={reaction === 'any' ? 'active' : ''}
                    onClick={() => set('reaction', 'any')}
                  >
                    All reactions
                  </button>
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      aria-label={'Filter ' + emoji}
                      className={reaction === emoji ? 'active' : ''}
                      onClick={() => set('reaction', emoji)}
                    >
                      <EmojiText text={emoji} />
                    </button>
                  ))}
                </div>
                <div className="filter-row">
                  <label>
                    <span>Sort</span>
                    <select value={sort} onChange={(e) => set('sort', e.target.value)}>
                      <option value="newest">Newest first</option>
                      <option value="popular">Most reacted</option>
                    </select>
                  </label>
                  <label>
                    <span>At least</span>
                    <select value={min} onChange={(e) => set('min', e.target.value)}>
                      {[0, 3, 5, 7, 10].map((n) => (
                        <option value={n} key={n}>
                          {n ? n + ' reactions' : 'Any count'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            {tab === 'stickers' && (
              <>
                <div className="filter-row">
                  <label>
                    <span>Pack</span>
                    <select value={pack} onChange={(e) => set('pack', e.target.value)}>
                      <option value="">All packs</option>
                      {[...new Set(stickers.map((s) => s.pack))].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  {stickerId && (
                    <button className="text-button" onClick={() => set('sticker', '')}>
                      Clear sticker
                    </button>
                  )}
                </div>
                <div className="sticker-gallery">
                  {gallery.map((s) => (
                    <button
                      key={s.id}
                      className={stickerId === s.id ? 'active' : ''}
                      onClick={() => set('sticker', stickerId === s.id ? '' : s.id)}
                    >
                      <img src={s.src} alt={s.name} />
                      <span>{s.name}</span>
                      <small>{stickerStats(data.messages, chat.id, s.id).count} uses</small>
                    </button>
                  ))}
                </div>
                {stats && (
                  <div className="sticker-stats">
                    <b>
                      {stats.count} times, by {Object.keys(stats.users).length} people
                    </b>
                    <span>
                      Most active: {stats.peakMonth} ·{' '}
                      {Object.entries(stats.users)
                        .map(([id, n]) => person(id).name + ' ' + n)
                        .join(' · ')}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="results-label">
              <span>
                {results.length.toLocaleString()} {results.length === 1 ? 'message' : 'messages'}
              </span>
              <label>
                <select
                  aria-label="Filter by sender"
                  value={sender}
                  onChange={(e) => set('sender', e.target.value)}
                >
                  <option value="">All senders</option>
                  {chat.members.map((id) => (
                    <option value={id} key={id}>
                      {person(id).name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="search-results">
            {results.slice(0, limit).map((m) => (
              <Result key={m.id} message={m} />
            ))}
            {!results.length && (
              <Empty title="No messages found">Try a different filter or a shorter search.</Empty>
            )}
            {results.length > limit && (
              <button className="load-more" onClick={() => setLimit(limit + 40)}>
                Show more messages
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
function Result({ message, number }: { message: Message; number?: number }) {
  const { jump, data } = useApp();
  const p = person(message.senderId);
  const sticker = stickers.find((s) => s.id === message.stickerId);
  const previous = useMemo(() => {
    const scope = data.messages.filter((m) => m.chatId === message.chatId);
    return scope[scope.findIndex((m) => m.id === message.id) - 1];
  }, [data.messages, message]);
  return (
    <button className="result" onClick={() => jump(message)}>
      <Avatar src={p.avatar} color={p.color} size={37} />
      <span className="result-body">
        <span className="result-heading">
          <b>
            {number && <span className="citation-number">{number}</span>}
            {p.name}
          </b>
          <time>{shortDay(message.timestamp)}</time>
        </span>
        {sticker ? (
          <span className="sticker-result">
            <img src={sticker.src} alt={sticker.name} />
            <span>
              <b>{sticker.name}</b>
              <small>
                <EmojiText text={previous?.text ? '↳ ' + previous.text : 'Sticker message'} />
              </small>
            </span>
          </span>
        ) : (
          <span className="result-text">
            <EmojiText text={message.text} />
          </span>
        )}
        <span className="result-reactions">
          {message.reactions.map((r) => (
            <span key={r.emoji}>
              <EmojiText text={r.emoji} /> {r.count}
            </span>
          ))}
          <span className="result-jump">
            View in chat <ChevronRight size={11} />
          </span>
        </span>
      </span>
    </button>
  );
}
const suggestions = [
  'How did the frog joke start?',
  'What are our funniest moments?',
  'Which Harry Potter characters are we?',
  'What happened on our summer trip?',
  'Which sticker do we use the most?',
  'Who gets roasted the most?',
];
const answerCache = new Map<string, { asked: string; answer: Answer }>();
function AIView({ chat }: { chat: Chat }) {
  const { data, aiMode, notice } = useApp();
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(answerCache.get(chat.id)?.asked || '');
  const [answer, setAnswer] = useState<Answer | null>(answerCache.get(chat.id)?.answer || null);
  const [stream, setStream] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    if (answer) answerCache.set(chat.id, { asked, answer });
  }, [answer, asked, chat.id]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
    };
  }, []);
  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setAsked(q);
    setQuestion('');
    setAnswer(null);
    setStream('');
    setError('');
    setCancelled(false);
    setLoading(true);
    try {
      if (aiMode === 'local') {
        const result = localAnswer(data.messages, chat.id, q);
        for (const token of result.text.match(/.{1,35}/gs) ?? []) {
          if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
          if (alive.current) setStream((s) => s + token);
          await new Promise((r) => setTimeout(r, 15));
        }
        if (alive.current) setAnswer(result);
      } else {
        const response = await fetch('/api/ask', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, chatId: chat.id, mode: aiMode }),
        });
        if (!response.ok || !response.body)
          throw new Error(
            'The AI server is unavailable. Switch to Local evidence in Settings or retry.',
          );
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        let buffer = '';
        let complete = false;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const event of events) {
            if (!event.startsWith('data: ')) continue;
            const item = JSON.parse(event.slice(6));
            if (item.type === 'delta') setStream((s) => s + item.text);
            if (item.type === 'done') {
              setAnswer(item.answer);
              complete = true;
            }
            if (item.type === 'error') throw new Error(item.message);
          }
        }
        if (!complete) throw new Error('The response ended before it was complete. Please retry.');
      }
    } catch (e) {
      if (alive.current) {
        if (controller.signal.aborted) setCancelled(true);
        else setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  };
  const sources =
    answer?.sourceIds
      .map((id) => data.messages.find((m) => m.id === id && m.chatId === chat.id))
      .filter((m): m is Message => !!m) ?? [];
  return (
    <div className="ai-view">
      <div className="ai-scope">
        <span>
          <Avatar src={chat.avatar} color={chat.color} size={23} />
          Only in {chat.name}
        </span>
        <Link to="/settings">
          {aiMode === 'local' ? 'Local evidence' : 'Connected AI'}
          <ChevronRight size={12} />
        </Link>
      </div>
      <div className="ai-scroll">
        {!asked ? (
          <>
            <div className="ai-intro">
              <div className="sparkle-orb">
                <Sparkles size={30} />
              </div>
              <h2>
                A question away
                <br />
                from a memory.
              </h2>
              <p>
                The jokes. The plans. That one conversation.
                <br />
                Find a little more than a keyword.
              </p>
            </div>
            <div className="suggestions">
              {suggestions.map((q, i) => (
                <button key={q} onClick={() => ask(q)}>
                  <span>
                    <EmojiText text={['🐸', '😂', '⚡', '☀️', '😎', '🔥'][i]} />
                  </span>
                  {q}
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
            <p className="ai-disclaimer">
              {aiMode === 'local'
                ? 'Try it without an API key. Local mode retrieves real passages from the demo and shows their sources. Connect a model in Settings for generated interpretations.'
                : 'AI answers use selected messages from this fictional chat. Your question and retrieved passages are sent to the configured provider. New local messages are excluded in connected mode.'}
            </p>
          </>
        ) : (
          <>
            <div className="question-bubble">
              <EmojiText text={asked} />
            </div>
            <div className="answer-label">
              <Sparkles size={17} />
              <b>{aiMode === 'local' ? 'Recall · Local evidence' : 'Recall AI'}</b>
              {loading && <span className="typing-dots">•••</span>}
            </div>
            <div className="answer-text" aria-live="polite">
              <AnswerMarkdown text={answer?.text || stream || 'Finding the relevant moments…'} />
              {loading && <span className="stream-caret" />}
            </div>
            {sources.length > 0 && (
              <div className="source-block">
                <div className="section-caption">
                  FROM THE CONVERSATION <span>{sources.length} sources</span>
                </div>
                {sources.map((m, i) => (
                  <Result key={m.id} message={m} number={i + 1} />
                ))}
              </div>
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
                <button onClick={() => ask(asked)}>Retry</button>
              </div>
            )}
            {cancelled && (
              <div className="form-note">
                Generation cancelled. Partial text has not been verified.
                <button className="text-button" onClick={() => ask(asked)}>
                  Try again
                </button>
              </div>
            )}
            {answer && (
              <>
                <div className="answer-actions">
                  <button
                    onClick={() =>
                      navigator.clipboard
                        .writeText(answer.text)
                        .then(() => notice('Answer copied'))
                        .catch(() => notice('Clipboard unavailable'))
                    }
                  >
                    <Copy size={15} />
                    Copy answer
                  </button>
                  <span>
                    {answer.mode === 'local'
                      ? 'Retrieved locally · No model used'
                      : 'Sources checked against retrieved history'}
                  </span>
                </div>
                <div className="followups">
                  <span>Keep exploring</span>
                  {suggestions
                    .filter((q) => q !== asked)
                    .slice(0, 2)
                    .map((q) => (
                      <button key={q} onClick={() => ask(q)}>
                        {q}
                        <ArrowUp size={15} />
                      </button>
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <form
        className="ai-composer"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <div>
          <Sparkles size={19} />
          <input
            aria-label="Ask about this conversation"
            placeholder={asked ? 'Ask a follow-up…' : 'Ask about this conversation…'}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={1200}
          />
          {loading ? (
            <button
              type="button"
              className="cancel-generation"
              onClick={() => abort.current?.abort()}
            >
              Stop
            </button>
          ) : (
            <button type="submit" aria-label="Ask question" disabled={!question.trim()}>
              <ArrowUp size={20} />
            </button>
          )}
        </div>
        <small>Answers with context. Memories with sources.</small>
      </form>
    </div>
  );
}
function InfoView({ chat }: { chat: Chat }) {
  const { data, jump } = useApp();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('Saved');
  const fragments = data.fragments.filter(
    (f) =>
      f.chatId === chat.id &&
      (f.title + ' ' + f.description + ' ' + f.category)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pins = pinnedMessages(data.messages, chat.id);
  return (
    <>
      <header className="screen-header">
        <Link className="back-link" to={'/chat/' + chat.id}>
          <ChevronLeft />
          Back
        </Link>
        <strong>Info</strong>
        <span className="header-spacer" />
      </header>
      <div className="info-scroll">
        <div className="profile">
          <Avatar src={chat.avatar} color={chat.color} size={86} />
          <h1>{chat.name}</h1>
          <span>
            {chat.members.length} {chat.members.length === 1 ? 'member' : 'members'}
          </span>
          <p>
            <EmojiText text={chat.description} />
          </p>
          <div className="profile-actions">
            <Link to={'/chat/' + chat.id}>
              <MessageCircle size={20} />
              Message
            </Link>
            <Link to={'/chat/' + chat.id + '/search'}>
              <Search size={20} />
              Search
            </Link>
            <Link to={'/chat/' + chat.id + '/search?tab=ai'}>
              <Sparkles size={20} />
              Ask AI
            </Link>
          </div>
        </div>
        <div className="media-tabs">
          {['Saved', 'Stickers', 'Members'].map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
              {t === 'Saved' && (
                <span>
                  {data.fragments.filter((f) => f.chatId === chat.id).length + pins.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {tab === 'Saved' ? (
          <>
            <div className="fragment-heading">
              <p>
                Everything worth keeping.
                <br />
                <span>Pinned messages and Fragments, together.</span>
              </p>
              <Bookmark size={22} />
            </div>
            <label className="search-field fragment-search">
              <Search size={17} />
              <input
                placeholder="Search pinned messages and fragments"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {pins.filter((m) => m.text.toLowerCase().includes(query.toLowerCase())).length > 0 && (
              <section className="saved-pins">
                <h2 className="saved-section-title">
                  <Pin size={15} /> Pinned messages
                </h2>
                {pins
                  .filter((m) => m.text.toLowerCase().includes(query.toLowerCase()))
                  .map((m) => (
                    <Result key={m.id} message={m} />
                  ))}
              </section>
            )}
            <h2 className="saved-section-title">
              <Bookmark size={15} /> Fragments
            </h2>
            <div className="fragment-list">
              {fragments.map((f) => {
                const first = data.messages.find((m) => m.id === f.messageIds[0]);
                return (
                  <Link
                    to={'/chat/' + chat.id + '/fragment/' + f.id}
                    key={f.id}
                    className="fragment-card"
                  >
                    <span className="fragment-emoji">
                      <EmojiText text={f.category} />
                    </span>
                    <div>
                      <span className="fragment-title">
                        <b>
                          <EmojiText text={f.title} />
                        </b>
                        <ChevronRight size={15} />
                      </span>
                      <p>
                        <EmojiText text={first?.text || 'Sticker'} />
                      </p>
                      <small>
                        {f.messageIds.length} messages<span>·</span>
                        {first ? shortDay(first.timestamp) : ''}
                        <span>·</span>
                        {f.participants
                          .slice(0, 3)
                          .map((id) => person(id).name)
                          .join(', ')}
                        {f.participants.length > 3 ? ' +' + (f.participants.length - 3) : ''}
                      </small>
                    </div>
                  </Link>
                );
              })}
              {!fragments.length && (
                <Empty
                  icon={<Bookmark size={30} />}
                  title={query ? 'No matching fragments' : 'Keep a little context'}
                >
                  {query
                    ? 'Try another word or clear the search.'
                    : 'Hold a message, or right-click it, and choose Save Fragment.'}
                </Empty>
              )}
            </div>
            <p className="fine-print">
              Fragments are saved on this device.
              <br />
              Keep single messages pinned and save whole moments as Fragments.
            </p>
          </>
        ) : tab === 'Members' ? (
          <div className="member-list">
            {chat.members.map((id) => (
              <div key={id}>
                <Avatar src={person(id).avatar} color={person(id).color} size={44} />
                <span>
                  <b>
                    {person(id).name}
                    {id === 'alex' ? ' (you)' : ''}
                  </b>
                  <small>last seen recently</small>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="info-stickers">
            {stickers
              .filter((s) =>
                data.messages.some((m) => m.chatId === chat.id && m.stickerId === s.id),
              )
              .map((s) => (
                <Link key={s.id} to={'/chat/' + chat.id + '/search?tab=stickers&sticker=' + s.id}>
                  <img src={s.src} alt={s.name} />
                  <b>{s.name}</b>
                  <span>{stickerStats(data.messages, chat.id, s.id).count} messages</span>
                </Link>
              ))}
            {!data.messages.some((m) => m.chatId === chat.id && m.stickerId) && (
              <Empty title="No stickers yet">Send one from the chat to see it here.</Empty>
            )}
          </div>
        )}
      </div>
    </>
  );
}
function FragmentView({ chat, id }: { chat: Chat; id: string }) {
  const { data, update, notice, jump } = useApp();
  const navigate = useNavigate();
  const f = data.fragments.find((f) => f.id === id && f.chatId === chat.id);
  const [edit, setEdit] = useState(false),
    [remove, setRemove] = useState(false),
    [name, setName] = useState(f?.title || '');
  if (!f)
    return (
      <>
        <header className="screen-header">
          <Link to={'/chat/' + chat.id + '/info'} className="back-link">
            <ChevronLeft />
            Saved
          </Link>
        </header>
        <Empty icon={<Bookmark />} title="Fragment not found">
          It may have been deleted on this device.
        </Empty>
      </>
    );
  const messages = f.messageIds
    .map((id) => data.messages.find((m) => m.id === id))
    .filter((m): m is Message => !!m);
  return (
    <>
      <header className="screen-header">
        <Link to={'/chat/' + chat.id + '/info'} className="back-link">
          <ChevronLeft />
          Saved
        </Link>
        <strong>Saved Fragment</strong>
        <IconButton
          label="Edit fragment"
          onClick={() => {
            setName(f.title);
            setEdit(true);
          }}
        >
          <Edit3 size={19} />
        </IconButton>
      </header>
      <div className="fragment-view-title">
        <span>
          <EmojiText text={f.category} />
        </span>
        <h2>
          <EmojiText text={f.title} />
        </h2>
        {f.description && (
          <p>
            <EmojiText text={f.description} />
          </p>
        )}
        <small>
          {messages.length} messages · {messages[0] ? day(messages[0].timestamp) : ''}
        </small>
      </div>
      <div className="fragment-conversation wallpaper">
        {messages.map((m) => (
          <MessageBubble compact key={m.id} message={m} />
        ))}
      </div>
      <div className="fragment-bottom">
        <button className="primary" onClick={() => messages[0] && jump(messages[0])}>
          <ArrowUp size={17} />
          Jump to Original Chat
        </button>
        <button className="text-button danger" onClick={() => setRemove(true)}>
          <Trash2 size={15} />
          Delete Fragment
        </button>
      </div>
      {edit && (
        <Modal title="Edit Fragment" onClose={() => setEdit(false)}>
          <form
            className="fragment-form"
            onSubmit={(e) => {
              e.preventDefault();
              update({
                ...data,
                fragments: data.fragments.map((x) =>
                  x.id === id ? { ...x, title: name.trim() || 'Untitled fragment' } : x,
                ),
              });
              setEdit(false);
              notice('Fragment updated');
            }}
          >
            <label>
              Title
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={90}
              />
            </label>
            <button type="submit" className="primary">
              Save Changes
            </button>
          </form>
        </Modal>
      )}
      {remove && (
        <Modal title="Delete Fragment?" onClose={() => setRemove(false)}>
          <div className="fragment-form">
            <p>
              This removes “<EmojiText text={f.title} />” from your saved Fragments. The original
              messages stay in the conversation.
            </p>
            <button
              className="primary destructive"
              onClick={() => {
                update({ ...data, fragments: data.fragments.filter((x) => x.id !== id) });
                navigate('/chat/' + chat.id + '/info');
                notice('Fragment deleted');
              }}
            >
              Delete Fragment
            </button>
            <button className="text-button" onClick={() => setRemove(false)}>
              Keep Fragment
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function SettingsView() {
  const { data, update, theme, setTheme, aiMode, setAiMode, notice } = useApp();
  const [reset, setReset] = useState(false);
  const [health, setHealth] = useState<{ provider: boolean; model: string } | null>(null);
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);
  const counts = {
    messages: data.messages.length,
    reactions: data.messages.filter((m) => m.reactions.length > 0).length,
    stickers: data.messages.filter((m) => m.stickerId).length,
  };
  return (
    <>
      <header className="screen-header">
        <Link to="/" className="back-link">
          <ChevronLeft />
          Chats
        </Link>
        <strong>Settings</strong>
        <span className="header-spacer" />
      </header>
      <div className="settings-scroll">
        <div className="settings-profile">
          <Avatar src={person('alex').avatar} color="#8b70d7" size={72} />
          <h1>{person('alex').name}</h1>
          <p>Fictional demo account</p>
        </div>
        <div className="settings-section">
          <h3>APPEARANCE</h3>
          <div className="theme-options">
            {['light', 'dark'].map((t) => (
              <button key={t} className={theme === t ? 'active' : ''} onClick={() => setTheme(t)}>
                <div className={'theme-preview ' + t}>
                  <div />
                  <span />
                  <span />
                  <span />
                </div>
                <span>
                  {t === 'light' ? 'Day' : 'Night'}
                  {theme === t && <Check size={15} />}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="settings-section">
          <h3>ASK AI</h3>
          <div className="settings-group">
            <label className="settings-row">
              <span>
                <Sparkles size={20} />
                Answer mode
              </span>
              <select value={aiMode} onChange={(e) => setAiMode(e.target.value)}>
                <option value="local">Local evidence</option>
                <option value="provider">Connected AI</option>
              </select>
            </label>
            <div className="settings-row">
              <span>Provider status</span>
              <span className="muted">
                {health?.provider ? 'Configured' : health ? 'No API key' : 'Server offline'}
              </span>
            </div>
            {health?.provider && (
              <div className="settings-row">
                <span>Model</span>
                <span className="muted">{health.model}</span>
              </div>
            )}
          </div>
          <p>
            Local evidence works without an API key and quotes retrieved messages. Connected AI uses
            a server-configured OpenAI-compatible provider for richer interpretations.
          </p>
          <details>
            <summary>Connect an AI provider</summary>
            <p>
              Copy .env.example to .env in the project folder, set OPENAI_API_KEY, OPENAI_BASE_URL
              and OPENAI_MODEL, then restart the server. Keys stay on the server. Only your question
              and relevant fictional messages are sent. Connected mode uses the original demo
              dataset; messages you add locally are available in Local evidence.
            </p>
          </details>
        </div>
        <div className="settings-section">
          <h3>DEMO DATA</h3>
          <div className="settings-group">
            <div className="settings-row">
              <span>Conversations</span>
              <b>{chats.length}</b>
            </div>
            <div className="settings-row">
              <span>Messages</span>
              <b>{counts.messages.toLocaleString()}</b>
            </div>
            <div className="settings-row">
              <span>Messages with reactions</span>
              <b>{counts.reactions}</b>
            </div>
            <div className="settings-row">
              <span>Sticker messages</span>
              <b>{counts.stickers}</b>
            </div>
            <div className="settings-row">
              <span>Saved Fragments</span>
              <b>{data.fragments.length}</b>
            </div>
            <button className="settings-row danger" onClick={() => setReset(true)}>
              <span>
                <Trash2 size={18} />
                Reset demo data
              </span>
              <ChevronRight size={17} />
            </button>
          </div>
          <p>
            All conversations are fictional. Messages and Fragments are stored locally in your
            browser. No Telegram account is connected.
          </p>
        </div>
        <div className="settings-section">
          <h3>ABOUT THIS CONCEPT</h3>
          <div className="about-card">
            <Bookmark size={25} />
            <strong>Telegram Recall</strong>
            <span>Find the moments that make a conversation yours.</span>
            <p>
              Reaction search, sticker search, Fragments, and answers with sources. An independent
              iOS design exploration.
            </p>
            <span className="stars-note">
              <Star size={15} /> Advanced analysis could use Telegram Stars.
              <br />
              Concept only · No purchases or payments.
            </span>
          </div>
        </div>
      </div>
      {reset && (
        <Modal title="Reset demo data?" onClose={() => setReset(false)}>
          <div className="fragment-form">
            <p>
              Your locally added messages and saved Fragments will be replaced with the original
              fictional dataset.
            </p>
            <button
              className="primary destructive"
              onClick={async () => {
                try {
                  update(await resetData());
                  setReset(false);
                  notice('Demo restored');
                } catch {
                  notice('Could not reset local storage');
                }
              }}
            >
              Reset Demo
            </button>
            <button className="text-button" onClick={() => setReset(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
