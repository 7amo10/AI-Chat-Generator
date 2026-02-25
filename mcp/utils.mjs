/**
 * Shared utility functions for the MCP server and CLI scripts.
 * Pure functions — no I/O side effects — so they are easily unit-tested.
 */

import fs from 'node:fs';

/**
 * Convert a human-readable title into a URL-safe slug.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Return today's date in YYYY-MM-DD format (local time).
 * @returns {string}
 */
export function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 * @param {string} dir
 */
export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * List all .mdx files in a directory.
 * Returns an empty array if the directory does not exist.
 * @param {string} dir
 * @returns {string[]}
 */
export function listMdxFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
}

/**
 * Parse the YAML frontmatter of an MDX file into a flat key→value map.
 * Only handles scalar values and quoted strings (sufficient for our schema).
 * Returns an empty object if no frontmatter block is found.
 * @param {string} filepath
 * @returns {Record<string, string>}
 */
export function readFrontmatter(filepath) {
  const raw = fs.readFileSync(filepath, 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1 || line.startsWith(' ')) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^"(.*)"$/, '$1');
    if (key) fm[key] = val;
  }
  return fm;
}

/**
 * Validate that a filename string is safe to use as an MDX filename.
 * Prevents path traversal attacks.
 * @param {string} filename
 * @returns {boolean}
 */
export function isSafeFilename(filename) {
  return /^[\w.-]+\.mdx$/.test(filename) && !filename.includes('..');
}
