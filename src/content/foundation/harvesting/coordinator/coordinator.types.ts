import type { HarvestProgressCallback } from "../harvesting.types";
import type { TEMPLATE_BASES_RESTORATION_ERROR_CODE } from "./template-bases-lease.const";

export type HarvestOptions = { onProgress?: HarvestProgressCallback; signal?: AbortSignal };

export type HarvestingLeaseOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type TemplateBasesRestorationError = Error & {
  code: typeof TEMPLATE_BASES_RESTORATION_ERROR_CODE;
};

export type TemplateBasesLeaseDependencies = {
  getRawValues: () => Promise<boolean>;
  withLease: <T>(run: () => Promise<T>, options?: HarvestingLeaseOptions) => Promise<T>;
};
