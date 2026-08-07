// TELEMETRY ASSERTION.
//
// Every generation records WHICH MODEL SERVED IT. Activation is confirmed from this log,
// not from the fact that a deployment or a config write succeeded. Deployment status says
// what was intended. Telemetry says what happened.

import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ModelId } from '../types.ts';

export interface TelemetryRow {
  readonly seq: number;
  readonly caseId: string;
  readonly servedBy: ModelId;
  readonly path: 'primary-drafting';
}

export function record(logPath: string, row: TelemetryRow): void {
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(row)}\n`, 'utf8');
}

export function readAll(logPath: string): readonly TelemetryRow[] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as TelemetryRow);
}

export interface ActivationAssertion {
  readonly confirmed: boolean;
  readonly expected: ModelId;
  readonly observed: readonly ModelId[];
  readonly rowsInspected: number;
}

/**
 * Confirm the model serving the tested path after activation.
 * An empty log is NOT confirmation: absence of contrary evidence is not evidence.
 */
export function assertServingModel(logPath: string, expected: ModelId): ActivationAssertion {
  const rows = readAll(logPath);
  const observed = [...new Set(rows.map((r) => r.servedBy))];
  return {
    confirmed: rows.length > 0 && observed.length === 1 && observed[0] === expected,
    expected,
    observed,
    rowsInspected: rows.length,
  };
}
