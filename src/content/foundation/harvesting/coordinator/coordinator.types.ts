import type { HarvestProgressCallback, SitecoreHarvestResult } from "../harvesting.types";
import type { WorkerTaskResult } from "../../workers/tasks/tasks.types";
import type { TEMPLATE_BASES_RESTORATION_ERROR_CODE } from "./template-bases-lease.const";

// Agent: Called with the finished harvest before the original editor state is restored (stateful harvests only).
export type HarvestedBeforeRestoreCallback = (results: readonly WorkerTaskResult[]) => void | Promise<void>;

export type HarvestOptions = {
  onProgress?: HarvestProgressCallback;
  signal?: AbortSignal;
  onResultBeforeRestore?: (result: SitecoreHarvestResult) => void | Promise<void>;
};

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
