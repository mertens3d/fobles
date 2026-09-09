import { LOGGER } from "./constants";
import type { Logger } from "./content.types";

const isDebugEnabled = (): boolean =>
  Boolean(
    (globalThis as typeof globalThis & { __sitecoreFoblesDebug?: boolean })
      .__sitecoreFoblesDebug,
  );

export function setExtensionDebugEnabled(enabled: boolean): void {
  (globalThis as typeof globalThis & { __sitecoreFoblesDebug?: boolean })
    .__sitecoreFoblesDebug = enabled;
}

export const extensionLog: Logger = {
  debug: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.log(LOGGER.NAMESPACE, ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.info(LOGGER.NAMESPACE, ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.warn(LOGGER.NAMESPACE, ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(LOGGER.NAMESPACE, ...args);
  },
};
