import { LOGGER } from "../../extension/constants";

const isDebugEnabled = (): boolean =>
  Boolean(
    (globalThis as typeof globalThis & { __sitecoreFoblesDebug?: boolean })
      .__sitecoreFoblesDebug,
  );

export const fobleLog = {
  debug: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.log(LOGGER.NAMESPACE, "[Fobles]", ...args);
    }
  },
  Debug: (...args: unknown[]) => {
    fobleLog.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.info(LOGGER.NAMESPACE, "[Fobles]", ...args);
    }
  },
  Info: (...args: unknown[]) => {
    fobleLog.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.warn(LOGGER.NAMESPACE, "[Fobles]", ...args);
    }
  },
  Warn: (...args: unknown[]) => {
    fobleLog.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(LOGGER.NAMESPACE, "[Fobles]", ...args);
  },
  Error: (...args: unknown[]) => {
    fobleLog.error(...args);
  },
};
