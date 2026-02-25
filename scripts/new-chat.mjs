#!/usr/bin/env node

/**
 * Scaffolds a new empty .mdx chat template.
 * Usage: npm run new-chat -- "My Chat Title"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHATS_DIR = path.resolve(__dirname, '../src/content/chats');

const title = process.argv[2] || 'Untitled Chat Session';
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const date = new Date().toISOString().split('T')[0];
const filename = `${date}-${slug}.mdx`;
const filepath = path.join(CHATS_DIR, filename);

if (fs.existsSync(filepath)) {
  console.error(`❌ File already exists: ${filename}`);
  process.exit(1);
}

const template = `---
title: "${title}"
date: ${date}
tags: []
tldr: ""
action_items:
  - task: ""
    done: false
---

## User

<!-- Write the user prompt here -->

## AI

<!-- Paste or write the AI response here -->
`;

fs.mkdirSync(CHATS_DIR, { recursive: true });
fs.writeFileSync(filepath, template, 'utf-8');

console.log(`✅ Created: src/content/chats/${filename}`);
