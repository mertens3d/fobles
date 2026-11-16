export type FoblesErrorRecord = {
  message: string;
  errorMessage: string | undefined;
  stack: string | undefined;
  context: Record<string, unknown> | undefined;
};
