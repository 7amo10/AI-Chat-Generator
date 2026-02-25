import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Milestone {
  title: string;
  weeks: string;
  status: 'not-started' | 'in-progress' | 'complete';
}

interface EditablePlanProps {
  filename: string;
  initialTitle: string;
  initialDate: string;
  initialTags: string[];
  initialTldr: string;
  initialDuration: string;
  initialDifficulty: 'beginner' | 'intermediate' | 'advanced';
  initialMilestones: Milestone[];
  initialBody: string;
}

// ─── Inline Markdown Renderer (read-only, for non-editing view) ───────────────

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))|(\*(.+?)\*)/g;
  let last = 0, match: RegExpExecArray | null, k = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={k++} className="font-semibold">{match[2]}</strong>);
    else if (match[3]) parts.push(<code key={k++} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-sm font-mono">{match[4]}</code>);
    else if (match[5]) parts.push(<a key={k++} href={match[7]} className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">{match[6]}</a>);
    else if (match[8]) parts.push(<em key={k++} className="text-purple-300">{match[9]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ─── Save Status Indicator ────────────────────────────────────────────────────

const SaveIndicator: FC<{ status: 'saved' | 'saving' | 'unsaved' | 'error' }> = ({ status }) => {
  const config = {
    saved:   { dot: 'bg-emerald-500', text: 'Saved', color: 'text-emerald-400' },
    saving:  { dot: 'bg-amber-400 animate-pulse', text: 'Saving…', color: 'text-amber-400' },
    unsaved: { dot: 'bg-amber-500', text: 'Unsaved changes', color: 'text-amber-400' },
    error:   { dot: 'bg-red-500', text: 'Save failed', color: 'text-red-400' },
  }[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${config.color} transition-all`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </div>
  );
};

// ─── Editable Text (click-to-edit inline) ────────────────────────────────────

const EditableText: FC<{
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}> = ({ value, onChange, className = '', placeholder = 'Click to edit…', multiline = false, as: Tag = 'span' }) => {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (editing) {
    const shared = {
      ref,
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => onChange(e.target.value),
      onBlur: () => setEditing(false),
      onKeyDown: (e: KeyboardEvent) => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); setEditing(false); }
        if (e.key === 'Escape') setEditing(false);
      },
      className: `w-full bg-blue-500/5 border border-blue-500/30 rounded-md px-2 py-1 outline-none text-foreground focus:border-blue-500/60 resize-none ${className}`,
      placeholder,
    };
    return multiline
      ? <textarea {...shared} rows={Math.max(3, value.split('\n').length + 1)} />
      : <input {...shared} />;
  }

  return (
    <Tag
      onClick={() => setEditing(true)}
      className={`cursor-text hover:bg-white/[0.03] rounded px-1 -mx-1 transition-colors group relative ${className} ${!value ? 'text-muted-foreground/40 italic' : ''}`}
      title="Click to edit"
    >
      {value || placeholder}
      <span className="opacity-0 group-hover:opacity-100 absolute -right-5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 transition-opacity">✎</span>
    </Tag>
  );
};

// ─── Tag Editor ───────────────────────────────────────────────────────────────

const TagEditor: FC<{ tags: string[]; onChange: (tags: string[]) => void }> = ({ tags, onChange }) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const commit = () => {
    const t = draft.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AnimatePresence>
        {tags.map((tag) => (
          <motion.span
            key={tag}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="group flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-muted text-muted-foreground hover:bg-muted/80"
          >
            #{tag}
            <button
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-red-400 transition-all ml-0.5 leading-none"
              title="Remove tag"
            >×</button>
          </motion.span>
        ))}
      </AnimatePresence>
      {adding ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setAdding(false); setDraft(''); } }}
          onBlur={commit}
          placeholder="tag-name"
          className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/10 border border-blue-500/30 text-blue-300 outline-none w-24"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="px-2 py-0.5 rounded-full text-xs font-mono border border-dashed border-border text-muted-foreground/50 hover:border-blue-500/40 hover:text-blue-400 transition-colors"
          title="Add tag"
        >+ tag</button>
      )}
    </div>
  );
};

// ─── Difficulty Selector ──────────────────────────────────────────────────────

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
const DIFF_STYLES = {
  beginner:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced:     'bg-red-500/10 text-red-400 border-red-500/20',
};

const DifficultySelector: FC<{
  value: 'beginner' | 'intermediate' | 'advanced';
  onChange: (v: 'beginner' | 'intermediate' | 'advanced') => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${DIFF_STYLES[value]} cursor-pointer hover:opacity-80 transition-opacity`}
        title="Change difficulty"
      >
        {value} ▾
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
          >
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => { onChange(d); setOpen(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors ${DIFF_STYLES[d]}`}
              >{d}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Milestone Editor ─────────────────────────────────────────────────────────

const STATUS_CYCLE: Milestone['status'][] = ['not-started', 'in-progress', 'complete'];
const STATUS_STYLES = {
  'not-started': { border: 'border-border', bg: 'bg-transparent', dot: 'bg-muted-foreground/30', label: 'text-muted-foreground' },
  'in-progress':  { border: 'border-blue-500/30', bg: 'bg-blue-500/5', dot: 'bg-blue-500 animate-pulse', label: 'text-blue-400' },
  'complete':     { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', dot: 'bg-emerald-500', label: 'text-emerald-400' },
};

const MilestoneEditor: FC<{
  milestones: Milestone[];
  onChange: (ms: Milestone[]) => void;
}> = ({ milestones, onChange }) => {
  const update = (i: number, patch: Partial<Milestone>) =>
    onChange(milestones.map((m, idx) => idx === i ? { ...m, ...patch } : m));

  const cycleStatus = (i: number) => {
    const cur = STATUS_CYCLE.indexOf(milestones[i].status);
    update(i, { status: STATUS_CYCLE[(cur + 1) % STATUS_CYCLE.length] });
  };

  const add = () => onChange([...milestones, { title: 'New Milestone', weeks: 'Week ?', status: 'not-started' }]);
  const remove = (i: number) => onChange(milestones.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {milestones.map((m, i) => {
          const st = STATUS_STYLES[m.status];
          return (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`group flex items-center gap-3 p-3 rounded-lg border ${st.border} ${st.bg} transition-all`}
            >
              {/* Status toggle */}
              <button
                onClick={() => cycleStatus(i)}
                title={`Status: ${m.status} — click to cycle`}
                className="flex-shrink-0 w-3 h-3 rounded-full transition-all hover:scale-125"
              >
                <span className={`block w-full h-full rounded-full ${st.dot}`} />
              </button>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <EditableText
                  value={m.title}
                  onChange={(v) => update(i, { title: v })}
                  className="text-sm font-medium text-foreground"
                  placeholder="Milestone title"
                />
              </div>

              {/* Weeks */}
              <EditableText
                value={m.weeks}
                onChange={(v) => update(i, { weeks: v })}
                className="text-xs font-mono text-muted-foreground"
                placeholder="Weeks"
              />

              {/* Status label (small) */}
              <span className={`hidden sm:block text-[10px] font-mono uppercase tracking-wider ${st.label} flex-shrink-0`}>
                {m.status}
              </span>

              {/* Delete */}
              <button
                onClick={() => remove(i)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-400 transition-all text-sm flex-shrink-0"
                title="Remove milestone"
              >✕</button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <button
        onClick={add}
        className="w-full p-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground/50 hover:border-blue-500/40 hover:text-blue-400 transition-colors"
      >+ Add milestone</button>
    </div>
  );
};

// ─── Section Editor ───────────────────────────────────────────────────────────

interface Section { level: 2 | 3; title: string; content: string; }

function parseSections(raw: string): Section[] {
  const sections: Section[] = [];
  const lines = raw.split('\n');
  let current: Section | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (current) { current.content = buf.join('\n').trim(); sections.push(current); buf = []; }
  };

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h2) { flush(); current = { level: 2, title: h2[1].trim(), content: '' }; }
    else if (h3) { flush(); current = { level: 3, title: h3[1].trim(), content: '' }; }
    else buf.push(line);
  }
  flush();
  return sections;
}

function sectionsToBody(intro: string, sections: Section[]): string {
  const parts: string[] = [];
  if (intro.trim()) parts.push(intro.trim());
  for (const s of sections) {
    parts.push(`${'#'.repeat(s.level)} ${s.title}`);
    if (s.content) parts.push(s.content);
  }
  return parts.join('\n\n');
}

/** Render content with interactive checklists */
const ContentRenderer: FC<{
  content: string;
  onCheckToggle: (updated: string) => void;
}> = ({ content, onCheckToggle }) => {
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let ulBuf: string[] = [];
  let olBuf: string[] = [];

  const flushUl = (key: number) => {
    if (!ulBuf.length) return;
    elements.push(
      <ul key={key} className="space-y-1 my-2">
        {ulBuf.map((li, i) => {
          const checkMatch = li.match(/^\[([ xX])\] (.+)/);
          if (checkMatch) {
            const checked = checkMatch[1] !== ' ';
            const text = checkMatch[2];
            const lineIdx = lines.findIndex(l => l.trim() === (checked ? `- [x] ${text}` : `- [ ] ${text}`) || l.trim() === (checked ? `- [X] ${text}` : `- [ ] ${text}`));
            return (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <button
                  onClick={() => {
                    const updated = lines.map(l => {
                      if (l.trim() === `- [x] ${text}` || l.trim() === `- [X] ${text}`) return l.replace(/\[.\]/, '[ ]');
                      if (l.trim() === `- [ ] ${text}`) return l.replace('[ ]', '[x]');
                      return l;
                    }).join('\n');
                    onCheckToggle(updated);
                  }}
                  className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all hover:scale-110 ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-blue-500/50'}`}
                >
                  {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </button>
                <span className={`flex-1 ${checked ? 'line-through text-muted-foreground' : ''}`}>{renderInline(text)}</span>
              </li>
            );
          }
          return <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" /><span className="text-foreground/80">{renderInline(li)}</span></li>;
        })}
      </ul>
    );
    ulBuf = [];
  };

  const flushOl = (key: number) => {
    if (!olBuf.length) return;
    elements.push(
      <ol key={key} className="space-y-1 my-2">
        {olBuf.map((li, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-mono flex-shrink-0">{i + 1}</span>
            <span className="text-foreground/80">{renderInline(li)}</span>
          </li>
        ))}
      </ol>
    );
    olBuf = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushUl(i * 10); flushOl(i * 10 + 1); return; }

    if (/^[-*]\s/.test(trimmed)) {
      flushOl(i * 10); ulBuf.push(trimmed.replace(/^[-*]\s/, '')); return;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      flushUl(i * 10); olBuf.push(trimmed.replace(/^\d+\.\s/, '')); return;
    }
    if (trimmed.startsWith('>')) {
      flushUl(i * 10); flushOl(i * 10 + 1);
      const q = trimmed.replace(/^>\s?/, '');
      const emojiMatch = q.match(/^([\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}])\s*(.+)/u);
      elements.push(emojiMatch
        ? <div key={i} className="flex items-start gap-3 p-3 my-2 rounded-lg bg-blue-500/5 border border-blue-500/10"><span className="text-lg">{emojiMatch[1]}</span><span className="text-sm text-foreground/70">{renderInline(emojiMatch[2])}</span></div>
        : <blockquote key={i} className="border-l-2 border-purple-500/50 pl-4 my-2 text-sm text-muted-foreground italic">{renderInline(q)}</blockquote>
      );
      return;
    }
    if (/^-{3,}$/.test(trimmed)) { flushUl(i * 10); flushOl(i * 10 + 1); elements.push(<hr key={i} className="border-border my-4" />); return; }

    flushUl(i * 10); flushOl(i * 10 + 1);
    elements.push(<p key={i} className="my-1.5 text-sm leading-relaxed text-foreground/80">{renderInline(trimmed)}</p>);
  });
  flushUl(9999); flushOl(9998);
  return <>{elements}</>;
};

const SectionBlock: FC<{
  section: Section;
  index: number;
  onChange: (patch: Partial<Section>) => void;
}> = ({ section, index, onChange }) => {
  const [editingContent, setEditingContent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isH2 = section.level === 2;

  useEffect(() => {
    if (editingContent) textareaRef.current?.focus();
  }, [editingContent]);

  const handleCheckToggle = (updated: string) => onChange({ content: updated });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={isH2 ? 'mt-8 first:mt-0' : 'mt-5 ml-2'}
    >
      {isH2 ? (
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-blue-500/5 to-purple-500/5 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-500 to-purple-500 flex-shrink-0" />
            <EditableText
              as="h2"
              value={section.title}
              onChange={(v) => onChange({ title: v })}
              className="text-lg font-bold text-foreground flex-1"
              placeholder="Section title"
            />
          </div>
          <div className="px-5 py-4">
            {editingContent ? (
              <textarea
                ref={textareaRef}
                value={section.content}
                onChange={(e) => onChange({ content: e.target.value })}
                onBlur={() => setEditingContent(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setEditingContent(false); }}
                className="w-full bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-sm font-mono text-foreground/90 outline-none focus:border-blue-500/40 resize-none leading-relaxed"
                rows={Math.max(5, section.content.split('\n').length + 2)}
                placeholder="Write markdown here…"
              />
            ) : (
              <div
                onClick={() => setEditingContent(true)}
                className="cursor-text min-h-[2rem] hover:bg-white/[0.02] rounded-lg p-1 -m-1 transition-colors group"
                title="Click to edit content"
              >
                {section.content
                  ? <ContentRenderer content={section.content} onCheckToggle={handleCheckToggle} />
                  : <span className="text-sm text-muted-foreground/40 italic">Click to add content…</span>
                }
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="pl-4 border-l border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-3.5 rounded-full bg-purple-500/40 flex-shrink-0" />
            <EditableText
              as="h3"
              value={section.title}
              onChange={(v) => onChange({ title: v })}
              className="text-sm font-semibold text-foreground/90 flex-1"
              placeholder="Subsection title"
            />
          </div>
          <div>
            {editingContent ? (
              <textarea
                ref={textareaRef}
                value={section.content}
                onChange={(e) => onChange({ content: e.target.value })}
                onBlur={() => setEditingContent(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setEditingContent(false); }}
                className="w-full bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-sm font-mono text-foreground/80 outline-none focus:border-blue-500/40 resize-none"
                rows={Math.max(4, section.content.split('\n').length + 2)}
                placeholder="Write markdown here…"
              />
            ) : (
              <div
                onClick={() => setEditingContent(true)}
                className="cursor-text min-h-[1.5rem] hover:bg-white/[0.02] rounded p-1 -m-1 transition-colors"
                title="Click to edit"
              >
                {section.content
                  ? <ContentRenderer content={section.content} onCheckToggle={handleCheckToggle} />
                  : <span className="text-sm text-muted-foreground/40 italic">Click to add content…</span>
                }
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── Main EditablePlan Component ──────────────────────────────────────────────

const EditablePlan: FC<EditablePlanProps> = ({
  filename,
  initialTitle,
  initialDate,
  initialTags,
  initialTldr,
  initialDuration,
  initialDifficulty,
  initialMilestones,
  initialBody,
}) => {
  // State for all editable fields
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState(initialTags);
  const [tldr, setTldr] = useState(initialTldr);
  const [duration, setDuration] = useState(initialDuration);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);

  // Parse body into sections
  const [intro, setIntro] = useState(() => {
    const lines = initialBody.split('\n');
    const buf: string[] = [];
    for (const line of lines) {
      if (/^##\s/.test(line)) break;
      buf.push(line);
    }
    return buf.join('\n').trim();
  });
  const [sections, setSections] = useState<Section[]>(() => parseSections(initialBody));

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const isFirstRender = useRef(true);

  // Auto-save: debounce 1.2s after any change
  const schedulesSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const body = sectionsToBody(intro, sections);
        const res = await fetch('/api/update-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            frontmatter: { title, date: initialDate, tags, tldr, duration, difficulty, milestones },
            body,
          }),
        });
        setSaveStatus(res.ok ? 'saved' : 'error');
      } catch {
        setSaveStatus('error');
      }
    }, 1200);
  }, [title, tags, tldr, duration, difficulty, milestones, intro, sections, filename, initialDate]);

  // Trigger save on any state change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    schedulesSave();
  }, [title, tags, tldr, duration, difficulty, milestones, intro, sections]);

  // Section helpers
  const updateSection = (i: number, patch: Partial<Section>) =>
    setSections((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  const addSection = (level: 2 | 3) =>
    setSections((prev) => [...prev, { level, title: level === 2 ? 'New Section' : 'New Subsection', content: '' }]);

  const removeSection = (i: number) =>
    setSections((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="py-6">
      {/* ── Header ── */}
      <div className="max-w-3xl mx-auto mb-8 space-y-4">

        {/* Title + save indicator */}
        <div className="flex items-start gap-3">
          <EditableText
            as="h1"
            value={title}
            onChange={setTitle}
            className="text-3xl font-bold text-foreground flex-1 leading-tight"
            placeholder="Plan title…"
          />
          <div className="flex-shrink-0 mt-2">
            <SaveIndicator status={saveStatus} />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="font-mono">{initialDate}</span>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <EditableText
              value={duration}
              onChange={setDuration}
              className="text-sm text-muted-foreground"
              placeholder="Duration"
            />
          </div>
          <span className="text-border">·</span>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </div>

        {/* Tags */}
        <TagEditor tags={tags} onChange={setTags} />

        {/* TL;DR */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/10">
          <p className="text-xs font-medium text-blue-400 mb-1.5">TL;DR</p>
          <EditableText
            as="p"
            value={tldr}
            onChange={setTldr}
            className="text-sm text-foreground/80 leading-relaxed"
            placeholder="One-line summary of this plan…"
            multiline
          />
        </div>

        {/* Milestones */}
        <div className="p-5 rounded-lg bg-card border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Milestones
            <span className="ml-auto text-xs text-muted-foreground/50 font-normal">click dot to change status</span>
          </h3>
          <MilestoneEditor milestones={milestones} onChange={setMilestones} />
        </div>
      </div>

      {/* ── Intro text ── */}
      {(intro || sections.length === 0) && (
        <div className="max-w-3xl mx-auto mb-4">
          <div className="text-foreground/60 text-sm leading-relaxed">
            <EditableText
              as="p"
              value={intro}
              onChange={setIntro}
              className="text-sm text-foreground/60 leading-relaxed"
              placeholder="Add an intro paragraph…"
              multiline
            />
          </div>
        </div>
      )}

      {/* ── Sections ── */}
      <div className="max-w-3xl mx-auto space-y-1">
        {sections.map((section, i) => (
          <div key={i} className="group/section relative">
            <SectionBlock
              section={section}
              index={i}
              onChange={(patch) => updateSection(i, patch)}
            />
            {/* Remove section button */}
            <button
              onClick={() => removeSection(i)}
              className="absolute -right-8 top-4 opacity-0 group-hover/section:opacity-100 text-muted-foreground/30 hover:text-red-400 transition-all text-sm"
              title="Remove section"
            >✕</button>
          </div>
        ))}

        {/* Add section buttons */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={() => addSection(2)}
            className="flex-1 p-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground/50 hover:border-blue-500/40 hover:text-blue-400 transition-colors"
          >+ Add Section (##)</button>
          <button
            onClick={() => addSection(3)}
            className="flex-1 p-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground/50 hover:border-purple-500/40 hover:text-purple-400 transition-colors"
          >+ Add Subsection (###)</button>
        </div>
      </div>
    </div>
  );
};

export default EditablePlan;
