import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EmojiText, remarkAppleEmoji } from './EmojiText';

export function AnswerMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkAppleEmoji]}
      skipHtml
      components={{
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        img: ({ alt }) => <EmojiText text={alt || ''} />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
