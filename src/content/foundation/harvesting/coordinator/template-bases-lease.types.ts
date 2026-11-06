import type { TEMPLATE_BASES_RESTORATION_ERROR_CODE } from "./template-bases-lease.const.ts";
import type { HarvestingLeaseOptions } from "./reference-harvesting-lease.types.ts";

export type TemplateBasesRestorationError = Error & {
  code: typeof TEMPLATE_BASES_RESTORATION_ERROR_CODE;
};

export type TemplateBasesLeaseDependencies = {
  getRawValues: () => Promise<boolean>;
  withLease: <T>(run: () => Promise<T>, options?: HarvestingLeaseOptions) => Promise<T>;
};