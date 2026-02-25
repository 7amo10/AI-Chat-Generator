import { type FC, type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PlanContentProps {
  rawContent: string;
}

/* ─── Section Parser ─── */

interface Section {
  level: number;
  title: string;
  content: string;
  icon?: string;
}

function parseSections(raw: string): Section[] {
  const sections: Section[] = [];
  const lines = raw.split('\n');
  let current: Section | null = null;
  let contentLines: string[] = [];

  const flush = () => {
    if (current) {
      current.content = contentLines.join('\n').trim();
      sections.push(current);
      contentLines = [];
    }
  };

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);

    if (h2Match) {
      flush();
      current = { level: 2, title: h2Match[1].trim(), content: '' };
    } else if (h3Match) {
      flush();
      current = { level: 3, title: h3Match[1].trim(), content: '' };
    } else {
      contentLines.push(line);
    }
  }
  flush();

  return sections;
}

/* ─── Inline Markdown ─── */

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))|(\*(.+?)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={k++} className="font-semibold text-foreground">{match[2]}</strong>);
    else if (match[3]) parts.push(<code key={k++} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-sm font-mono">{match[4]}</code>);
    else if (match[5]) parts.push(<a key={k++} href={match[7]} className="text-blue-400 underline decoration-blue-400/30 hover:decoration-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">{match[6]}</a>);
    else if (match[8]) parts.push(<em key={k++} className="text-purple-300">{match[9]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* ─── Block Renderer ─── */

function renderBlock(content: string): ReactNode {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let olItems: string[] = [];
  let checklistItems: { checked: boolean; text: string }[] = [];

  const flushUl = () => {
    if (listItems.length) {
      elements.push(
        <ul key={elements.length} className="space-y-1.5 my-3">
          {listItems.map((li, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-foreground/80">{renderInline(li)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushOl = () => {
    if (olItems.length) {
      elements.push(
        <ol key={elements.length} className="space-y-1.5 my-3 counter-reset-list">
          {olItems.map((li, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-mono flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-foreground/80">{renderInline(li)}</span>
            </li>
          ))}
        </ol>
      );
      olItems = [];
    }
  };

  const flushChecklist = () => {
    if (checklistItems.length) {
      elements.push(
        <ul key={elements.length} className="space-y-2 my-3">
          {checklistItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                {item.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={item.checked ? 'text-muted-foreground line-through' : 'text-foreground/80'}>
                {renderInline(item.text)}
              </span>
            </li>
          ))}
        </ul>
      );
      checklistItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushUl(); flushOl(); flushChecklist();
      continue;
    }

    // Checklist items: - [ ] or - [x]
    const checkMatch = trimmed.match(/^[-*]\s\[([ xX])\]\s(.+)/);
    if (checkMatch) {
      flushUl(); flushOl();
      checklistItems.push({ checked: checkMatch[1] !== ' ', text: checkMatch[2] });
      continue;
    }

    if (/^[-*]\s/.test(trimmed)) {
      flushOl(); flushChecklist();
      listItems.push(trimmed.replace(/^[-*]\s/, ''));
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushUl(); flushChecklist();
      olItems.push(trimmed.replace(/^\d+\.\s/, ''));
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushUl(); flushOl(); flushChecklist();
      const quoteText = trimmed.replace(/^>\s?/, '');
      // Check if it's an emoji callout like > 📖 or > ⚡
      const emojiMatch = quoteText.match(/^([\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}])\s*(.+)/u);
      if (emojiMatch) {
        elements.push(
          <div key={elements.length} className="flex items-start gap-3 p-3 my-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <span className="text-lg">{emojiMatch[1]}</span>
            <span className="text-sm text-foreground/70">{renderInline(emojiMatch[2])}</span>
          </div>
        );
      } else {
        elements.push(
          <blockquote key={elements.length} className="border-l-2 border-purple-500/50 pl-4 my-3 text-sm text-muted-foreground italic">
            {renderInline(quoteText)}
          </blockquote>
        );
      }
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      flushUl(); flushOl(); flushChecklist();
      elements.push(<hr key={elements.length} className="border-border my-6" />);
      continue;
    }

    flushUl(); flushOl(); flushChecklist();
    elements.push(
      <p key={elements.length} className="my-2 text-sm leading-relaxed text-foreground/80">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushUl(); flushOl(); flushChecklist();
  return <>{elements}</>;
}

/* ─── Section Card ─── */

const SectionCard: FC<{ section: Section; index: number }> = ({ section, index }) => {
  const isH2 = section.level === 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`relative ${isH2 ? 'mt-10 first:mt-0' : 'mt-6'}`}
    >
      {isH2 ? (
        // Major section — full-width card
        <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-blue-500/5 to-purple-500/5">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
              {section.title}
            </h2>
          </div>
          <div className="px-6 py-5">
            {renderBlock(section.content)}
          </div>
        </div>
      ) : (
        // Sub-section — indented card
        <div className="ml-4 pl-4 border-l border-border/50">
          <h3 className="text-base font-semibold text-foreground/90 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500/50" />
            {section.title}
          </h3>
          <div className="text-foreground/70">
            {renderBlock(section.content)}
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* ─── Main Component ─── */

const PlanContent: FC<PlanContentProps> = ({ rawContent }) => {
  const sections = parseSections(rawContent);

  // Extract content before the first heading as intro
  const lines = rawContent.split('\n');
  let introLines: string[] = [];
  for (const line of lines) {
    if (/^##\s/.test(line)) break;
    introLines.push(line);
  }
  const intro = introLines.join('\n').trim();

  return (
    <div className="space-y-2 py-6">
      {intro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-foreground/60 text-sm leading-relaxed mb-8"
        >
          {renderBlock(intro)}
        </motion.div>
      )}
      {sections.map((section, i) => (
        <SectionCard key={i} section={section} index={i} />
      ))}
    </div>
  );
};

export default PlanContent;
