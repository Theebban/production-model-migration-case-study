// THE APPLICATION'S GENERATION LOG, used as ModelPromote's telemetry source.
//
// Every generation the application serves appends one row naming the model that ACTUALLY
// answered, taken from the provider's response rather than from what was requested. That
// distinction is the whole point: deployment status says what was intended, and only the
// application's own record says what happened.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ServingObservation, TelemetrySource } from 'modelpromote';
import type { ModelId } from '../types.ts';

export interface GenerationRow {
  readonly requestId: string;
  readonly caseId: string;
  readonly requested: ModelId;
  readonly servedBy: ModelId;
}

export class GenerationLog implements TelemetrySource {
  readonly name = 'application generation log';
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  rows(): readonly GenerationRow[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, 'utf8')
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as GenerationRow);
  }

  append(row: Omit<GenerationRow, 'requestId'>): GenerationRow {
    const full: GenerationRow = { requestId: `gen-${String(this.rows().length + 1).padStart(6, '0')}`, ...row };
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, `${JSON.stringify(full)}\n`, 'utf8');
    return full;
  }

  /**
   * Rows recorded after `sinceRequestId`, or every row when it is null. ModelPromote passes the
   * last row it saw before issuing verification traffic, so evaluation traffic recorded
   * earlier can never count as evidence of activation.
   */
  observations(sinceRequestId: string | null): readonly ServingObservation[] {
    const all = this.rows();
    const start = sinceRequestId === null ? 0 : all.findIndex((r) => r.requestId === sinceRequestId) + 1;
    return all.slice(start).map((r) => ({ requestId: r.requestId, servedBy: r.servedBy }));
  }
}
