import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  slugify,
  today,
  ensureDir,
  listMdxFiles,
  readFrontmatter,
  isSafeFilename,
} from '../mcp/utils.mjs';

slugify // ── ───────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('collapses multiple non-alphanumeric chars into one hyphen', () => {
    expect(slugify('React   &   TypeScript!')).toBe('react-typescript');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello');
  });

  it('handles already-slugified strings unchanged', () => {
    expect(slugify('my-slug-123')).toBe('my-slug-123');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

// ── today ────────────────────────────────────────────────────────────────────

describe('today', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the current local date', () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    expect(today()).toBe(`${y}-${m}-${day}`);
  });
});

ensureDir // ── ─

describe('ensureDir', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acg-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a directory that does not exist', () => {
    const target = path.join(tmpDir, 'a', 'b', 'c');
    expect(fs.existsSync(target)).toBe(false);
    ensureDir(target);
    expect(fs.existsSync(target)).toBe(true);
  });

  it('is idempotent — calling twice does not throw', () => {
    const target = path.join(tmpDir, 'idempotent');
    ensureDir(target);
    expect(() => ensureDir(target)).not.toThrow();
  });
});

listMdxFiles // ── ───────────────────────────────

describe('listMdxFiles', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acg-test-'));
    fs.writeFileSync(path.join(tmpDir, 'a.mdx'), '');
    fs.writeFileSync(path.join(tmpDir, 'b.mdx'), '');
    fs.writeFileSync(path.join(tmpDir, 'ignore.txt'), '');
    fs.writeFileSync(path.join(tmpDir, 'ignore.md'), '');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns only .mdx files', () => {
    const files = listMdxFiles(tmpDir);
    expect(files.sort()).toEqual(['a.mdx', 'b.mdx']);
  });

  it('returns an empty array for a non-existent directory', () => {
    expect(listMdxFiles('/does/not/exist')).toEqual([]);
  });
});

// ── readFrontmatter ──────────────────────────────────────────────────────────

describe('readFrontmatter', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acg-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses scalar values from a standard frontmatter block', () => {
    const file = path.join(tmpDir, 'test.mdx');
    fs.writeFileSync(file, `---\ntitle: "My Title"\ndate: 2026-01-15\n---\n\n## Body`);
    const fm = readFrontmatter(file);
    expect(fm.title).toBe('My Title');
    expect(fm.date).toBe('2026-01-15');
  });

  it('strips surrounding quotes from string values', () => {
    const file = path.join(tmpDir, 'q.mdx');
    fs.writeFileSync(file, `---\ntldr: "A quoted summary"\n---`);
    const fm = readFrontmatter(file);
    expect(fm.tldr).toBe('A quoted summary');
  });

  it('returns an empty object when no frontmatter block exists', () => {
    const file = path.join(tmpDir, 'empty.mdx');
    fs.writeFileSync(file, '## No frontmatter here');
    expect(readFrontmatter(file)).toEqual({});
  });

  it('ignores indented lines (nested YAML values)', () => {
    const file = path.join(tmpDir, 'nested.mdx');
    fs.writeFileSync(file, `---\ntitle: "Plan"\nmilestones:\n  - title: "Phase 1"\n---`);
    const fm = readFrontmatter(file);
    expect(fm.title).toBe('Plan');
    expect(fm['  - title']).toBeUndefined();
  });
});

// ── isSafeFilename ───────────────────────────────────────────────────────────

describe('isSafeFilename', () => {
  it('accepts a valid MDX filename', () => {
    expect(isSafeFilename('2026-02-25-my-plan.mdx')).toBe(true);
    expect(isSafeFilename('my-chat.mdx')).toBe(true);
  });

  it('rejects path traversal attempts', () => {
    expect(isSafeFilename('../secrets.mdx')).toBe(false);
    expect(isSafeFilename('../../etc/passwd')).toBe(false);
  });

  it('rejects non-.mdx extensions', () => {
    expect(isSafeFilename('file.txt')).toBe(false);
    expect(isSafeFilename('file.md')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isSafeFilename('')).toBe(false);
  });

  it('rejects filenames with path separators', () => {
    expect(isSafeFilename('subdir/file.mdx')).toBe(false);
  });
});
