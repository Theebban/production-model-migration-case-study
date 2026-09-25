// Test helpers: a fresh case study in a temporary directory, and a deterministic clock.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCaseStudy } from '../src/wiring.ts';
import type { CaseStudy } from '../src/wiring.ts';

export function tick(): () => string {
  let n = 0;
  return () => new Date(Date.UTC(2026, 0, 1, 0, 0, n++)).toISOString();
}

export function freshStudy(): { study: CaseStudy; dispose: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'a1-case-study-'));
  return { study: createCaseStudy(root, tick()), dispose: () => rmSync(root, { recursive: true, force: true }) };
}
