// Fixture loading. Small enough to inspect by hand, frozen so the benchmark is deterministic.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ExpectedOutcome, MaintenanceNote } from './types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'fixtures', 'synthetic');

export function loadNotes(): readonly MaintenanceNote[] {
  return JSON.parse(readFileSync(join(dir, 'notes.json'), 'utf8')) as MaintenanceNote[];
}

export function loadExpected(): readonly ExpectedOutcome[] {
  return JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8')) as ExpectedOutcome[];
}
