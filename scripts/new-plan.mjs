#!/usr/bin/env node

/**
 * Scaffolds a new empty .mdx plan template.
 * Usage: npm run new-plan -- "My Plan Title"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANS_DIR = path.resolve(__dirname, '../src/content/plans');

const title = process.argv[2] || 'Untitled Plan';
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const date = new Date().toISOString().split('T')[0];
const filename = `${date}-${slug}.mdx`;
const filepath = path.join(PLANS_DIR, filename);

if (fs.existsSync(filepath)) {
  console.error(`❌ File already exists: ${filename}`);
  process.exit(1);
}

const template = `---
title: "${title}"
date: ${date}
tags: []
tldr: ""
duration: ""
difficulty: "intermediate"
milestones:
  - title: ""
    weeks: ""
    status: "not-started"
---

## Overview

<!-- Write your plan content here using ## and ### headings -->

## Phase 1

### Week 1

- Task one
- Task two
`;

fs.mkdirSync(PLANS_DIR, { recursive: true });
fs.writeFileSync(filepath, template, 'utf-8');

console.log(`✅ Created: src/content/plans/${filename}`);
