import type { Secret } from "./secret";

export type AutoLoginContext = {
  username?: string;
  password?: Secret;
};