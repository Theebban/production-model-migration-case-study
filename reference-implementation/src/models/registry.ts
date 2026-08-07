// SYNTHETIC MODEL ADAPTERS.
//
// Deterministic, offline, credential-free. Identifiers are deliberately fictional so the
// demonstration stays provider-neutral. Each adapter applies a different, hand-written
// heuristic so the comparative benchmark has something real to separate.

import type { MaintenanceNote, MaintenanceDraft, ModelAdapter, ModelId } from '../types.ts';

const HIGH_SIGNALS = ['crack', 'leak', 'overheat', 'smoke', 'vibration'];
const MEDIUM_SIGNALS = ['wear', 'noise', 'drift', 'seep'];

function severityFrom(note: string, signals: readonly string[], fallbackHigh: boolean):
  MaintenanceDraft['severity'] {
  const lower = note.toLowerCase();
  if (signals.some((s) => lower.includes(s))) return fallbackHigh ? 'high' : 'medium';
  if (MEDIUM_SIGNALS.some((s) => lower.includes(s))) return 'medium';
  return 'low';
}

function checksFrom(note: string, vocabulary: readonly string[]): string[] {
  const lower = note.toLowerCase();
  return vocabulary.filter((term) => lower.includes(term)).map((term) => `inspect-${term}`);
}

/** Conservative candidate: recalls fewer checks, rarely escalates severity. */
const candidateAlpha: ModelAdapter = {
  id: 'synthetic-candidate-alpha',
  draft(note: MaintenanceNote): MaintenanceDraft {
    return {
      caseId: note.caseId,
      servedBy: 'synthetic-candidate-alpha',
      summary: `Asset ${note.asset}: ${note.rawNote.trim().slice(0, 80)}`,
      severity: severityFrom(note.rawNote, HIGH_SIGNALS, false),
      recommendedChecks: checksFrom(note.rawNote, ['seal', 'bearing']),
    };
  },
};

/** Broader candidate: recalls more checks and escalates on high signals. */
const candidateBeta: ModelAdapter = {
  id: 'synthetic-candidate-beta',
  draft(note: MaintenanceNote): MaintenanceDraft {
    return {
      caseId: note.caseId,
      servedBy: 'synthetic-candidate-beta',
      summary: `Asset ${note.asset}: ${note.rawNote.trim().slice(0, 80)}`,
      severity: severityFrom(note.rawNote, HIGH_SIGNALS, true),
      recommendedChecks: checksFrom(note.rawNote, ['seal', 'bearing', 'coupling', 'gasket']),
    };
  },
};

const ADAPTERS: readonly ModelAdapter[] = [candidateAlpha, candidateBeta];

export function knownModelIds(): readonly ModelId[] {
  return ADAPTERS.map((a) => a.id);
}

export function adapterFor(id: ModelId): ModelAdapter {
  const found = ADAPTERS.find((a) => a.id === id);
  if (!found) throw new Error(`No adapter registered for "${id}"`);
  return found;
}

export function allAdapters(): readonly ModelAdapter[] {
  return ADAPTERS;
}
