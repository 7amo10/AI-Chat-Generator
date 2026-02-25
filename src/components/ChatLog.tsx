import { useState, type FC, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CodeBlock from './CodeBlock';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

/* ─── Markdown Renderer ─── */

interface RenderedBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseBlocks(content: string): RenderedBlock[] {
  const blocks: RenderedBlock[] = [];
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) blocks.push({ type: 'text', content: text });
    }
    blocks.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  const remaining = content.slice(lastIndex).trim();
  if (remaining) blocks.push({ type: 'text', content: remaining });

  return blocks;
}

/** Renders inline markdown (bold, italic, inline code, links) */
function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match bold, italic, inline code, and links
  const inlineRegex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))|(\*(.+?)\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[1]) {
      // bold
      parts.push(<strong key={key++} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3]) {
      // inline code
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-accent-foreground">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // link
      parts.push(
        <a key={key++} href={match[7]} className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">
          {match[6]}
        </a>
      );
    } else if (match[8]) {
      // italic
      parts.push(<em key={key++}>{match[9]}</em>);
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

function renderTextBlock(text: string): ReactNode {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let olItems: string[] = [];

  const flushUl = () => {
    if (listItems.length) {
      elements.push(
        <ul key={elements.length} className="list-disc list-inside space-y-1 my-2 text-sm">
          {listItems.map((li, i) => <li key={i}>{renderInlineMarkdown(li)}</li>)}
        </ul>
      );
      listItems = [];
    }
  };

  const flushOl = () => {
    if (olItems.length) {
      elements.push(
        <ol key={elements.length} className="list-decimal list-inside space-y-1 my-2 text-sm">
          {olItems.map((li, i) => <li key={i}>{renderInlineMarkdown(li)}</li>)}
        </ol>
      );
      olItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushUl();
      flushOl();
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(trimmed)) {
      flushOl();
      listItems.push(trimmed.replace(/^[-*]\s/, ''));
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      flushUl();
      olItems.push(trimmed.replace(/^\d+\.\s/, ''));
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushUl();
      flushOl();
      elements.push(
        <blockquote key={elements.length} className="border-l-2 border-blue-500/50 pl-4 my-2 text-sm text-muted-foreground italic">
          {renderInlineMarkdown(trimmed.replace(/^>\s?/, ''))}
        </blockquote>
      );
      continue;
    }

    flushUl();
    flushOl();
    elements.push(
      <p key={elements.length} className="my-1.5 text-sm leading-relaxed">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  flushUl();
  flushOl();
  return <>{elements}</>;
}

/* ─── Message Bubbles ─── */

const UserBubble: FC<{ content: string }> = ({ content }) => {
  const blocks = parseBlocks(content);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-end mb-6"
    >
      <div className="max-w-[80%] lg:max-w-[65%]">
        {/* Avatar row */}
        <div className="flex items-center justify-end gap-2 mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">You</span>
          <div className="w-7 h-7 rounded-full bg-user-bubble flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        </div>
        {/* Bubble */}
        <div className="bg-user-bubble text-user-text rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-lg shadow-blue-500/10">
          {blocks.map((block, i) =>
            block.type === 'code' ? (
              <CodeBlock key={i} code={block.content} language={block.language || 'text'} />
            ) : (
              <div key={i}>{renderTextBlock(block.content)}</div>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AIBubble: FC<{ content: string; index: number }> = ({ content, index }) => {
  const blocks = parseBlocks(content);
  const hasCodeBlocks = blocks.some((b) => b.type === 'code');
  const [collapsed, setCollapsed] = useState(false);

  // Split blocks into text and code
  const textBlocks = blocks.filter((b) => b.type === 'text');
  const codeBlocks = blocks.filter((b) => b.type === 'code');

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex justify-start mb-6"
    >
      <div className="max-w-[85%] lg:max-w-[75%]">
        {/* Avatar row */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-muted-foreground">AI</span>
          {hasCodeBlocks && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-muted"
            >
              <svg
                className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {collapsed ? 'Show text' : 'Code only'}
            </button>
          )}
        </div>
        {/* Bubble */}
        <div className="bg-ai-bubble text-ai-text rounded-2xl rounded-tl-sm px-5 py-3.5 border border-border shadow-lg shadow-black/20">
          <AnimatePresence mode="wait">
            {collapsed ? (
              <motion.div
                key="code-only"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {codeBlocks.length > 0 ? (
                  codeBlocks.map((block, i) => (
                    <CodeBlock key={i} code={block.content} language={block.language || 'text'} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No code blocks in this response.</p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {blocks.map((block, i) =>
                  block.type === 'code' ? (
                    <CodeBlock key={i} code={block.content} language={block.language || 'text'} />
                  ) : (
                    <div key={i}>{renderTextBlock(block.content)}</div>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Main ChatLog Component ─── */

interface ChatLogProps {
  rawContent: string;
}

const ChatLog: FC<ChatLogProps> = ({ rawContent }) => {
  const messages = parseChatContent(rawContent);

  return (
    <div className="space-y-2 py-6">
      {messages.map((msg, i) =>
        msg.role === 'user' ? (
          <UserBubble key={i} content={msg.content} />
        ) : (
          <AIBubble key={i} content={msg.content} index={i} />
        )
      )}
    </div>
  );
};

/** Parse raw content string into messages */
function parseChatContent(raw: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const sections = raw.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const firstNewline = section.indexOf('\n');
    if (firstNewline === -1) continue;

    const heading = section.slice(0, firstNewline).trim().toLowerCase();
    const content = section.slice(firstNewline + 1).trim();
    if (!content) continue;

    if (heading === 'user') messages.push({ role: 'user', content });
    else if (heading === 'ai') messages.push({ role: 'ai', content });
  }

  return messages;
}

export default ChatLog;
