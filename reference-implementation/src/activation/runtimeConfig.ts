// CONFIGURATION-AUTHORITATIVE ACTIVATION, as a ModelPromote activation target.
//
// The model the application serves is resolved from runtime configuration, never from a
// literal at a call site. Changing it is a configuration write, and reverting it is the
// same class of operation. ModelPromote reads the value back after every write, so a write
// that silently changes nothing is caught rather than recorded as success.
//
// Two refusals are deliberate:
//   - reading a MISSING or unknown value throws, because a silent default is
//     indistinguishable from a successful migration until telemetry contradicts it;
//   - writing an unknown model throws, so configuration can never name something the
//     application cannot serve.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ActivationTarget } from 'modelpromote';
import type { ModelId } from '../types.ts';
import { KNOWN_MODELS, UnknownModelError } from '../provider/syntheticProvider.ts';

export class MissingRuntimeConfigError extends Error {
  constructor(path: string) {
    super(`No runtime configuration at ${path}. Refusing to assume a default model.`);
    this.name = 'MissingRuntimeConfigError';
  }
}

export class RuntimeConfigTarget implements ActivationTarget {
  readonly name = 'runtime configuration (primaryModel)';
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  read(): ModelId {
    if (!existsSync(this.path)) throw new MissingRuntimeConfigError(this.path);
    const value = (JSON.parse(readFileSync(this.path, 'utf8')) as { primaryModel?: unknown }).primaryModel;
    if (typeof value !== 'string' || !KNOWN_MODELS.includes(value)) throw new UnknownModelError(String(value));
    return value;
  }

  write(model: ModelId): void {
    if (!KNOWN_MODELS.includes(model)) throw new UnknownModelError(model);
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, `${JSON.stringify({ primaryModel: model }, null, 2)}\n`, 'utf8');
  }
}
