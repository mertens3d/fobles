export const getLastTwoPathItems = (path?: string): string =>
  (path ?? "").split("/").filter(Boolean).slice(-2).join("/");