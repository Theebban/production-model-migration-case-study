// HUMAN REVIEW BEFORE FINAL ACTION.
//
// The model proposes. A person disposes. Nothing is sent, executed or scheduled by the
// system. An unreviewed draft cannot reach a terminal state, and that is enforced by the
// type of the returned value rather than by reviewer discipline.

import type { MaintenanceDraft } from '../types.ts';

export type ReviewDecision = 'accepted' | 'edited' | 'rejected';

export interface ReviewedDraft {
  readonly draft: MaintenanceDraft;
  readonly decision: ReviewDecision;
  readonly reviewer: string;
  readonly editedSummary?: string;
}

export class UnreviewedActionError extends Error {
  constructor(caseId: string) {
    super(`Case ${caseId} has no human review. The system never acts on an unreviewed draft.`);
    this.name = 'UnreviewedActionError';
  }
}

export function review(
  draft: MaintenanceDraft,
  decision: ReviewDecision,
  reviewer: string,
  editedSummary?: string,
): ReviewedDraft {
  return editedSummary === undefined
    ? { draft, decision, reviewer }
    : { draft, decision, reviewer, editedSummary };
}

/** The only path to a terminal outcome. Requires a review; never auto-executes. */
export function finalise(reviewed: ReviewedDraft | null, caseId: string): string {
  if (reviewed === null) throw new UnreviewedActionError(caseId);
  if (reviewed.decision === 'rejected') return `case ${caseId}: rejected by ${reviewer(reviewed)}, no action taken`;
  const text = reviewed.editedSummary ?? reviewed.draft.summary;
  return `case ${caseId}: ${reviewed.decision} by ${reviewer(reviewed)} :: ${text}`;
}

function reviewer(r: ReviewedDraft): string {
  return r.reviewer;
}
