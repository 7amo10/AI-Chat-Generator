export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

// process.cwd() is always the project root, works in dev and SSR
const PLANS_DIR = path.join(process.cwd(), 'src/content/plans');

function serializeYamlValue(value: unknown): string {
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  return String(value);
}

function buildFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'milestones' && Array.isArray(value)) {
      lines.push('milestones:');
      for (const m of value as { title: string; weeks: string; status: string }[]) {
        lines.push(`  - title: ${serializeYamlValue(m.title)}`);
        lines.push(`    weeks: ${serializeYamlValue(m.weeks)}`);
        lines.push(`    status: "${m.status}"`);
      }
    } else if (key === 'tags' && Array.isArray(value)) {
      const arr = (value as string[]).map((t) => `"${t}"`).join(', ');
      lines.push(`tags: [${arr}]`);
    } else if (value !== undefined && value !== null) {
      lines.push(`${key}: ${serializeYamlValue(value)}`);
    }
  }
  return lines.join('\n');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { filename, frontmatter, body: mdxBody } = body as {
      filename: string;
      frontmatter: Record<string, unknown>;
      body: string;
    };

    if (!filename || !/^[\w.-]+\.mdx$/.test(filename)) {
      return new Response(JSON.stringify({ error: 'Invalid filename' }), { status: 400 });
    }

    const filepath = path.join(PLANS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return new Response(JSON.stringify({ error: `Not found: ${filepath}` }), { status: 404 });
    }

    const fm = buildFrontmatter(frontmatter);
    const content = `---\n${fm}\n---\n\n${mdxBody.trim()}\n`;
    fs.writeFileSync(filepath, content, 'utf-8');

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};
