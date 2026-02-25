import { describe, it, expect } from 'vitest';

/**
 * Inline the pure helpers from update-plan.ts so we can test them
 * without importing the full Astro API route.
 */
function serializeYamlValue(value: unknown): string {
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  return String(value);
}

type Milestone = { title: string; weeks: string; status: string };

function buildFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'milestones' && Array.isArray(value)) {
      lines.push('milestones:');
      for (const m of value as Milestone[]) {
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

serializeYamlValue // ── ───────────────

describe('serializeYamlValue', () => {
  it('wraps strings in double quotes', () => {
    expect(serializeYamlValue('hello')).toBe('"hello"');
  });

  it('escapes backslashes in strings', () => {
    expect(serializeYamlValue('C:\\path')).toBe('"C:\\\\path"');
  });

  it('escapes double quotes in strings', () => {
    expect(serializeYamlValue('say "hi"')).toBe('"say \\"hi\\""');
  });

  it('serializes booleans as plain text', () => {
    expect(serializeYamlValue(true)).toBe('true');
    expect(serializeYamlValue(false)).toBe('false');
  });

  it('serializes numbers as plain text', () => {
    expect(serializeYamlValue(42)).toBe('42');
    expect(serializeYamlValue(3.14)).toBe('3.14');
  });
});

// ── buildFrontmatter ─────────────────────────────────────────────────────────

describe('buildFrontmatter', () => {
  it('produces key: "value" lines for string fields', () => {
    const result = buildFrontmatter({ title: 'My Plan', tldr: 'A summary' });
    expect(result).toContain('title: "My Plan"');
    expect(result).toContain('tldr: "A summary"');
  });

  it('serializes tags as an inline YAML array', () => {
    const result = buildFrontmatter({ tags: ['java', 'gsoc'] });
    expect(result).toBe('tags: ["java", "gsoc"]');
  });

  it('serializes an empty tags array', () => {
    const result = buildFrontmatter({ tags: [] });
    expect(result).toBe('tags: []');
  });

  it('serializes milestones into multi-line block', () => {
    const result = buildFrontmatter({
      milestones: [
        { title: 'Phase 1', weeks: 'Weeks 1-4', status: 'complete' },
        { title: 'Phase 2', weeks: 'Weeks 5-8', status: 'not-started' },
      ],
    });
    expect(result).toContain('milestones:');
    expect(result).toContain('  - title: "Phase 1"');
    expect(result).toContain('    weeks: "Weeks 1-4"');
    expect(result).toContain('    status: "complete"');
    expect(result).toContain('  - title: "Phase 2"');
  });

  it('omits undefined and null values', () => {
    const result = buildFrontmatter({ title: 'X', missing: undefined, alsoMissing: null });
    expect(result).not.toContain('missing');
    expect(result).not.toContain('alsoMissing');
  });
});
