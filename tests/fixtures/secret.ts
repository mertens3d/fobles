import { inspect } from "node:util";

// Keeps a sensitive string out of anything that stringifies a value by accident - console.log,
// JSON.stringify, template literals, a future debug dump of the whole credentials object. reveal()
// is the only way to get the real value back, so every real use site is an explicit, searchable call.
export class Secret {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return "[REDACTED]";
  }

  toJSON(): string {
    return "[REDACTED]";
  }

  [inspect.custom](): string {
    return "Secret([REDACTED])";
  }
}
