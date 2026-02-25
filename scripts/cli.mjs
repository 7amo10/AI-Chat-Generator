#!/usr/bin/env node

/**
 * CLI helper — wraps common MCP operations as short terminal commands.
 *
 * Usage:
 *   npm run ls                         → list all chats & plans
 *   npm run ls -- chats                → list only chats
 *   npm run ls -- plans                → list only plans
 *   npm run add -- <filename> user     → append a User message (reads from stdin)
 *   npm run add -- <filename> ai       → append an AI message (reads from stdin)
 *   npm run open -- <filename>         → print a file's content to terminal
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHATS_DIR = path.join(ROOT, 'src/content/chats');
const PLANS_DIR = path.join(ROOT, 'src/content/plans');

const [, , command, ...args] = process.argv;

function listMdx(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
}

function readFM(filepath) {
  const raw = fs.readFileSync(filepath, 'utf-8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const [k, ...v] = line.split(':');
    if (k && v.length && !k.startsWith(' ')) fm[k.trim()] = v.join(':').trim().replace(/^"(.*)"$/, '$1');
  }
  return fm;
}

function resolveFile(filename) {
  // Try chats first, then plans
  const chat = path.join(CHATS_DIR, filename);
  if (fs.existsSync(chat)) return { filepath: chat, collection: 'chats' };
  const plan = path.join(PLANS_DIR, filename);
  if (fs.existsSync(plan)) return { filepath: plan, collection: 'plans' };
  return null;
}

// ─── list ────────────────────────────────────────────────────────────────────

if (command === 'list') {
  const filter = args[0] || 'all';

  if (filter !== 'plans') {
    const files = listMdx(CHATS_DIR);
    console.log('\n📝 Chats:');
    if (!files.length) {
      console.log('   (none) — run: npm run chat -- "My Chat Title"');
    } else {
      files.forEach((f, i) => {
        const fm = readFM(path.join(CHATS_DIR, f));
        const idx = String(i + 1).padStart(2, ' ');
        console.log(`  ${idx}. ${f}`);
        console.log(`      ↳ ${fm.title || 'Untitled'} · ${fm.date || '?'}`);
        if (fm.tldr) console.log(`      ↳ ${fm.tldr}`);
      });
    }
  }

  if (filter !== 'chats') {
    const files = listMdx(PLANS_DIR);
    console.log('\n📋 Plans:');
    if (!files.length) {
      console.log('   (none) — run: npm run plan -- "My Plan Title"');
    } else {
      files.forEach((f, i) => {
        const fm = readFM(path.join(PLANS_DIR, f));
        const idx = String(i + 1).padStart(2, ' ');
        console.log(`  ${idx}. ${f}`);
        console.log(`      ↳ ${fm.title || 'Untitled'} · ${fm.date || '?'}`);
        if (fm.tldr) console.log(`      ↳ ${fm.tldr}`);
      });
    }
  }

  console.log('');
}

// ─── add ─────────────────────────────────────────────────────────────────────

else if (command === 'add') {
  const [filename, role] = args;
  if (!filename || !role) {
    console.error('Usage: npm run add -- <filename.mdx> <user|ai>');
    console.error('Then type your message. Press Ctrl+D when done.');
    process.exit(1);
  }

  const resolved = resolveFile(filename);
  if (!resolved) {
    console.error(`❌ File not found: ${filename}`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines = [];
  console.log(`✏️  Type your ${role} message. Press Ctrl+D when done:\n`);
  rl.on('line', (line) => lines.push(line));
  rl.on('close', () => {
    const content = lines.join('\n').trim();
    if (!content) { console.error('❌ Empty message.'); process.exit(1); }
    const heading = role === 'user' ? 'User' : 'AI';
    fs.appendFileSync(resolved.filepath, `\n\n## ${heading}\n\n${content}`, 'utf-8');
    console.log(`\n✅ Appended ${heading} message to ${filename}`);
  });
}

// ─── open ─────────────────────────────────────────────────────────────────────

else if (command === 'open') {
  const [filename] = args;
  if (!filename) {
    console.error('Usage: npm run open -- <filename.mdx>');
    process.exit(1);
  }
  const resolved = resolveFile(filename);
  if (!resolved) {
    console.error(`❌ File not found: ${filename}`);
    process.exit(1);
  }
  console.log(fs.readFileSync(resolved.filepath, 'utf-8'));
}

// ─── fallback ────────────────────────────────────────────────────────────────

else {
  console.log(`
AI Chat Generator — CLI Reference
──────────────────────────────────────────────────────────────────
  npm run dev                         Start local dev server (http://localhost:4321)
  npm run build                       Build the static site
  npm run preview                     Preview built site

  npm run chat   -- "Title"           Create a new chat MDX file
  npm run plan   -- "Title"           Create a new plan MDX file
  npm run ls                          List all chats & plans
  npm run ls     -- chats             List only chats
  npm run ls     -- plans             List only plans
  npm run add    -- <file.mdx> user   Append a User message (stdin)
  npm run add    -- <file.mdx> ai     Append an AI message  (stdin)
  npm run open   -- <file.mdx>        Print file content to terminal

──────────────────────────────────────────────────────────────────
💡 From Copilot chat — just say:
  "Create a chat about X"
  "Add a user message to my last chat"
  "Create a 4-week plan for learning React"
  "List my chats"
  "Build the site"
──────────────────────────────────────────────────────────────────
`);
}
