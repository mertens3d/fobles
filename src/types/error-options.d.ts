// @source-path [fobles] src/types/error-options.d.ts

interface ErrorOptions {
  cause?: unknown;
}

interface ErrorConstructor {
  new(message?: string, options?: ErrorOptions): Error;
}
