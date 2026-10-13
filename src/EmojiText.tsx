import manifest from './apple-emoji.json';

const images: Record<string, string> = manifest;
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
export function emojiParts(text: string) {
  const parts: { text: string; src?: string }[] = [];
  for (const { segment } of segmenter.segment(text)) {
    const filename = images[segment.replace(/\uFE0F/g, '')];
    if (filename) parts.push({ text: segment, src: '/emoji/apple/' + filename });
    else if (parts.length && !parts.at(-1)!.src) parts.at(-1)!.text += segment;
    else parts.push({ text: segment });
  }
  return parts;
}

export function EmojiText({ text }: { text: string }) {
  return (
    <>
      {emojiParts(text).map((part, index) =>
        part.src ? (
          <img
            key={index}
            className="apple-emoji"
            src={part.src}
            alt={part.text}
            draggable={false}
          />
        ) : (
          part.text
        ),
      )}
    </>
  );
}

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  url?: string;
  alt?: string;
};
export function remarkAppleEmoji() {
  return (tree: MarkdownNode) => {
    function walk(node: MarkdownNode) {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (child.type !== 'text' || !child.value) {
          walk(child);
          return [child];
        }
        const nodes: MarkdownNode[] = [];
        for (const part of emojiParts(child.value)) {
          if (part.src) nodes.push({ type: 'image', url: part.src, alt: part.text });
          else if (nodes.at(-1)?.type === 'text') nodes.at(-1)!.value += part.text;
          else nodes.push({ type: 'text', value: part.text });
        }
        return nodes;
      });
    }
    walk(tree);
  };
}
