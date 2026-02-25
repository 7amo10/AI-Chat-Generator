import { useEffect, useRef, type FC, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface TimelineEntry {
  title: string;
  date: string;
  slug: string;
  tags: string[];
  tldr?: string;
  actionItems?: { task: string; done: boolean }[];
  type?: 'chat' | 'plan';
  href?: string;
}

interface TracingBeamProps {
  entries: TimelineEntry[];
}

const TracingBeam: FC<TracingBeamProps> = ({ entries }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center'],
  });

  const beamHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div ref={containerRef} className="relative max-w-4xl mx-auto py-12 px-4">
      {/* Beam line */}
      <div className="absolute left-8 md:left-12 top-0 bottom-0 w-px bg-border">
        <motion.div
          className="w-full bg-gradient-to-b from-blue-500 via-purple-500 to-transparent"
          style={{ height: beamHeight }}
        />
      </div>

      {/* Entries */}
      <div className="space-y-16">
        {entries.map((entry, i) => (
          <TimelineNode key={entry.slug} entry={entry} index={i} />
        ))}
      </div>
    </div>
  );
};

const TimelineNode: FC<{ entry: TimelineEntry; index: number }> = ({ entry, index }) => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative pl-16 md:pl-24"
    >
      {/* Commit dot */}
      <div className={`absolute left-[26px] md:left-[42px] top-1 w-4 h-4 rounded-full border-2 ${entry.type === 'plan' ? 'border-purple-500' : 'border-blue-500'} bg-card/80 backdrop-blur-sm z-10 shadow-lg ${entry.type === 'plan' ? 'shadow-purple-500/20' : 'shadow-blue-500/20'}`}>
        <div className={`absolute inset-1 rounded-full ${entry.type === 'plan' ? 'bg-purple-500' : 'bg-blue-500'} animate-pulse`} />
      </div>

      {/* Card */}
      <a
        href={entry.href || `/chats/${entry.slug}`}
        className="group block p-6 rounded-xl glass-card hover:border-blue-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
      >
        {/* Date */}
        <div className="flex items-center gap-3 mb-3">
          <time className="text-xs font-mono text-muted-foreground">
            {new Date(entry.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
          <div className="h-px flex-1 bg-border" />
          <svg
            className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-400 transition-colors mb-2 flex items-center gap-2">
          {entry.title}
          {entry.type === 'plan' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
              plan
            </span>
          )}
        </h3>

        {/* TLDR */}
        {entry.tldr && (
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{entry.tldr}</p>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs font-mono bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action items progress */}
        {entry.actionItems && entry.actionItems.length > 0 && (
          <ActionItemsProgress items={entry.actionItems} />
        )}
      </a>
    </motion.div>
  );
};

const ActionItemsProgress: FC<{ items: { task: string; done: boolean }[] }> = ({ items }) => {
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span>Action Items</span>
        <span>{done}/{total} complete</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default TracingBeam;
