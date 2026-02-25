#!/usr/bin/env node

/**
 * AI Chat Generator — MCP Server
 *
 * Provides tools for Copilot to create chats, plans, append messages,
 * list entries, and build the Astro site — all via stdio.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { slugify, today, ensureDir, listMdxFiles, readFrontmatter, isSafeFilename } from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHATS_DIR = path.join(PROJECT_ROOT, 'src/content/chats');
const PLANS_DIR = path.join(PROJECT_ROOT, 'src/content/plans');

// ─── MCP Server ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'ai-chat-generator',
  version: '1.0.0',
});

// ─── Tool: create_chat ──────────────────────────────────────────────────────

server.tool(
  'create_chat',
  'Create a new chat session MDX file with frontmatter and initial messages. Use this when starting a new brainstorming conversation to log.',
  {
    title: z.string().describe('Title of the chat session'),
    tags: z.array(z.string()).optional().describe('Tags for categorization, e.g. ["java", "gsoc"]'),
    tldr: z.string().optional().describe('One-line summary of the chat'),
    action_items: z.array(z.object({
      task: z.string(),
      done: z.boolean().default(false),
    })).optional().describe('List of action items from the chat'),
    messages: z.array(z.object({
      role: z.enum(['user', 'ai']),
      content: z.string(),
    })).optional().describe('Initial messages (array of {role, content})'),
  },
  async ({ title, tags, tldr, action_items, messages }) => {
    ensureDir(CHATS_DIR);
    const slug = slugify(title);
    const filename = `${today()}-${slug}.mdx`;
    const filepath = path.join(CHATS_DIR, filename);

    if (fs.existsSync(filepath)) {
      return { content: [{ type: 'text', text: `❌ File already exists: ${filename}` }] };
    }

    const tagStr = tags?.length ? `[${tags.map((t) => `"${t}"`).join(', ')}]` : '[]';
    const aiStr = action_items?.length
      ? action_items.map((a) => `  - task: "${a.task}"\n    done: ${a.done}`).join('\n')
      : '  - task: ""\n    done: false';

    let body = '';
    if (messages?.length) {
      body = messages.map((m) => `## ${m.role === 'user' ? 'User' : 'AI'}\n\n${m.content}`).join('\n\n');
    } else {
      body = '## User\n\n<!-- Write the user prompt here -->\n\n## AI\n\n<!-- Paste or write the AI response here -->';
    }

    const content = `---
title: "${title}"
date: ${today()}
tags: ${tagStr}
tldr: "${tldr || ''}"
action_items:
${aiStr}
---

${body}
`;

    fs.writeFileSync(filepath, content, 'utf-8');
    return {
      content: [{
        type: 'text',
        text: `✅ Created chat: src/content/chats/${filename}\n📍 URL: /chats/${today()}-${slug}`,
      }],
    };
  }
);

// ─── Tool: create_plan ──────────────────────────────────────────────────────

server.tool(
  'create_plan',
  'Create a new plan/article MDX file with rich frontmatter and structured content. Use for study plans, roadmaps, guides.',
  {
    title: z.string().describe('Title of the plan'),
    tags: z.array(z.string()).optional().describe('Tags, e.g. ["java", "gsoc"]'),
    tldr: z.string().optional().describe('One-line summary'),
    duration: z.string().optional().describe('Duration string, e.g. "3 months (Aug-Oct)"'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Difficulty level'),
    milestones: z.array(z.object({
      title: z.string(),
      weeks: z.string(),
      status: z.enum(['not-started', 'in-progress', 'complete']).default('not-started'),
    })).optional().describe('Plan milestones with progress tracking'),
    body: z.string().describe('Full markdown body content (use ## and ### headings for sections)'),
  },
  async ({ title, tags, tldr, duration, difficulty, milestones, body }) => {
    ensureDir(PLANS_DIR);
    const slug = slugify(title);
    const filename = `${slug}.mdx`;
    const filepath = path.join(PLANS_DIR, filename);

    if (fs.existsSync(filepath)) {
      return { content: [{ type: 'text', text: `❌ File already exists: ${filename}` }] };
    }

    const tagStr = tags?.length ? `[${tags.map((t) => `"${t}"`).join(', ')}]` : '[]';
    const msStr = milestones?.length
      ? milestones.map((m) => `  - title: "${m.title}"\n    weeks: "${m.weeks}"\n    status: "${m.status}"`).join('\n')
      : '  - title: ""\n    weeks: ""\n    status: "not-started"';

    const content = `---
title: "${title}"
date: ${today()}
tags: ${tagStr}
tldr: "${tldr || ''}"
duration: "${duration || ''}"
difficulty: "${difficulty || 'intermediate'}"
milestones:
${msStr}
---

${body}
`;

    fs.writeFileSync(filepath, content, 'utf-8');
    return {
      content: [{
        type: 'text',
        text: `✅ Created plan: src/content/plans/${filename}\n📍 URL: /plans/${slug}`,
      }],
    };
  }
);

// ─── Tool: add_message ──────────────────────────────────────────────────────

server.tool(
  'add_message',
  'Append a new User or AI message to an existing chat session. Great for continuing a logged conversation.',
  {
    filename: z.string().describe('The .mdx filename (e.g. "2026-02-25-my-chat.mdx")'),
    role: z.enum(['user', 'ai']).describe('Message role'),
    content: z.string().describe('Message content (markdown)'),
  },
  async ({ filename, role, content }) => {
    if (!isSafeFilename(filename)) {
      return { content: [{ type: 'text', text: `Invalid filename: ${filename}` }] };
    }
    const filepath = path.join(CHATS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return { content: [{ type: 'text', text: `Chat not found: ${filename}` }] };
    }

    const heading = role === 'user' ? 'User' : 'AI';
    const addition = `\n\n## ${heading}\n\n${content}`;
    fs.appendFileSync(filepath, addition, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: `✅ Appended ${heading} message to ${filename}`,
      }],
    };
  }
);

// ─── Tool: update_frontmatter ───────────────────────────────────────────────

server.tool(
  'update_frontmatter',
  'Update specific frontmatter fields of an existing chat or plan file (e.g. update tldr, tags, action_items, milestones).',
  {
    collection: z.enum(['chats', 'plans']).describe('Which collection the file belongs to'),
    filename: z.string().describe('The .mdx filename'),
    fields: z.record(z.string(), z.any()).describe('Key-value pairs to update in the frontmatter (e.g. {"tldr": "New summary", "tags": ["a","b"]})'),
  },
  async ({ collection, filename, fields }) => {
    if (!isSafeFilename(filename)) {
      return { content: [{ type: 'text', text: `Invalid filename: ${filename}` }] };
    }
    const dir = collection === 'chats' ? CHATS_DIR : PLANS_DIR;
    const filepath = path.join(dir, filename);
    if (!fs.existsSync(filepath)) {
      return { content: [{ type: 'text', text: `File not found: ${filename}` }] };
    }

    let raw = fs.readFileSync(filepath, 'utf-8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      return { content: [{ type: 'text', text: `❌ No frontmatter found in ${filename}` }] };
    }

    let fmBlock = fmMatch[1];
    const updated = [];

    for (const [key, value] of Object.entries(fields)) {
      const serialized = typeof value === 'string'
        ? `"${value}"`
        : JSON.stringify(value);

      const lineRegex = new RegExp(`^${key}:.*$`, 'm');
      if (lineRegex.test(fmBlock)) {
        if (Array.isArray(value)) {
          const yamlArr = `[${value.map((v) => typeof v === 'string' ? `"${v}"` : JSON.stringify(v)).join(', ')}]`;
          fmBlock = fmBlock.replace(lineRegex, `${key}: ${yamlArr}`);
        } else {
          fmBlock = fmBlock.replace(lineRegex, `${key}: ${serialized}`);
        }
        updated.push(key);
      }
    }

    raw = raw.replace(fmMatch[1], fmBlock);
    fs.writeFileSync(filepath, raw, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: `✅ Updated fields [${updated.join(', ')}] in ${collection}/${filename}`,
      }],
    };
  }
);

// ─── Tool: list_entries ─────────────────────────────────────────────────────

server.tool(
  'list_entries',
  'List all existing chats and/or plans with their titles and dates. Use to discover what content exists.',
  {
    collection: z.enum(['chats', 'plans', 'all']).optional().default('all').describe('Which collection to list'),
  },
  async ({ collection }) => {
    const results = [];

    if (collection === 'chats' || collection === 'all') {
      const chatFiles = listMdxFiles(CHATS_DIR);
      results.push('📝 Chats:');
      if (chatFiles.length === 0) {
        results.push('  (none)');
      } else {
        for (const f of chatFiles) {
          const fm = readFrontmatter(path.join(CHATS_DIR, f));
          results.push(`  • ${f} — ${fm.title || 'Untitled'} (${fm.date || '?'})`);
        }
      }
    }

    if (collection === 'plans' || collection === 'all') {
      const planFiles = listMdxFiles(PLANS_DIR);
      results.push('📋 Plans:');
      if (planFiles.length === 0) {
        results.push('  (none)');
      } else {
        for (const f of planFiles) {
          const fm = readFrontmatter(path.join(PLANS_DIR, f));
          results.push(`  • ${f} — ${fm.title || 'Untitled'} (${fm.date || '?'})`);
        }
      }
    }

    return { content: [{ type: 'text', text: results.join('\n') }] };
  }
);

// ─── Tool: get_entry ────────────────────────────────────────────────────────

server.tool(
  'get_entry',
  'Read the full content of a chat or plan file. Useful to review what has been logged so far.',
  {
    collection: z.enum(['chats', 'plans']).describe('Which collection'),
    filename: z.string().describe('The .mdx filename'),
  },
  async ({ collection, filename }) => {
    if (!isSafeFilename(filename)) {
      return { content: [{ type: 'text', text: `Invalid filename: ${filename}` }] };
    }
    const dir = collection === 'chats' ? CHATS_DIR : PLANS_DIR;
    const filepath = path.join(dir, filename);

    if (!fs.existsSync(filepath)) {
      return { content: [{ type: 'text', text: `Not found: ${collection}/${filename}` }] };
    }

    const raw = fs.readFileSync(filepath, 'utf-8');
    return { content: [{ type: 'text', text: raw }] };
  }
);

// ─── Tool: build_site ───────────────────────────────────────────────────────

server.tool(
  'build_site',
  'Build the Astro static site. Run after creating or modifying content to regenerate all pages.',
  {},
  async () => {
    try {
      const output = execSync('npm run build', {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        timeout: 60000,
      });
      const lines = output.split('\n').filter((l) => l.includes('└─') || l.includes('Complete') || l.includes('page(s)'));
      return {
        content: [{
          type: 'text',
          text: `✅ Build successful!\n${lines.join('\n')}`,
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: 'text',
          text: `❌ Build failed:\n${err.stderr || err.message}`,
        }],
      };
    }
  }
);

// ─── Tool: delete_entry ─────────────────────────────────────────────────────

server.tool(
  'delete_entry',
  'Delete a chat or plan MDX file. Use carefully — this is permanent.',
  {
    collection: z.enum(['chats', 'plans']).describe('Which collection'),
    filename: z.string().describe('The .mdx filename to delete'),
  },
  async ({ collection, filename }) => {
    if (!isSafeFilename(filename)) {
      return { content: [{ type: 'text', text: `Invalid filename: ${filename}` }] };
    }
    const dir = collection === 'chats' ? CHATS_DIR : PLANS_DIR;
    const filepath = path.join(dir, filename);

    if (!fs.existsSync(filepath)) {
      return { content: [{ type: 'text', text: `Not found: ${collection}/${filename}` }] };
    }

    fs.unlinkSync(filepath);
    return { content: [{ type: 'text', text: `Deleted: ${collection}/${filename}` }] };
  }
);

// ─── Start ──────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
