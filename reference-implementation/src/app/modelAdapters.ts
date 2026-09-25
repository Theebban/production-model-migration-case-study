// MODEL ADAPTERS: the application's call path to the provider.
//
// One adapter per model the application may call. Each generation goes through the
// provider and is recorded in the generation log with the model the provider REPORTS as
// having served it. The adapter never writes its own identifier into telemetry, which is
// what keeps verification from confirming itself.

import type { ModelAdapter } from 'modelpromote';
import type { MaintenanceNote, ModelId } from '../types.ts';
import type { SyntheticProvider } from '../provider/syntheticProvider.ts';
import type { GenerationLog } from './generationLog.ts';

export function modelAdapter(id: ModelId, provider: SyntheticProvider, log: GenerationLog): ModelAdapter {
  return {
    id,
    complete(input: string): string {
      const note = JSON.parse(input) as MaintenanceNote;
      const response = provider.respond(id, note);
      log.append({ caseId: note.caseId, requested: id, servedBy: response.servedBy });
      return JSON.stringify(response.draft);
    },
  };
}
