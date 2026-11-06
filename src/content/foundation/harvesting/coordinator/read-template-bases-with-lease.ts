import { STRUCTURAL } from "../../../../shared/structural/structural.const.ts";
import type { WorkSession } from "../../workers/session/work-session.types.ts";
import type { SitecoreItemLocator, WorkerTaskResult } from "../../workers/tasks/worker-task.types.ts";
import { TEMPLATE_BASES_RESTORATION_ERROR_CODE } from "./template-bases-lease.const.ts";
import type { TemplateBasesLeaseDependencies, TemplateBasesRestorationError } from "./template-bases-lease.types.ts";

export async function readTemplateBasesWithLease(
  session: WorkSession,
  item: SitecoreItemLocator,
  url: string,
  dependencies?: TemplateBasesLeaseDependencies,
): Promise<WorkerTaskResult | undefined> {
  const withLease = dependencies?.withLease ?? (await import("./reference-harvesting-lease.ts")).runWithReferenceHarvestingLease;
  const getRawValues = dependencies?.getRawValues ??
    (() => import("../../sitecore/macros/ribbon-toggle-macro.ts").then((macros) => macros.getScRawValuesState(document)));
  return withLease(async () => {
    const originalRawValues = await getRawValues();
    if (originalRawValues === undefined) {
      throw new Error("Could not determine Raw Values state before structural read");
    }
    let result: WorkerTaskResult | undefined;
    async function setRawValues(value: boolean): Promise<void> {
      const target = new URL(url);
      target.searchParams.set(STRUCTURAL.EDITOR_STATE_QUERY_PARAMETER, crypto.randomUUID());
      const state = await session.runTask({ taskId: crypto.randomUUID(), type: "set-raw-values", url: target.href, value });
      if (state?.status !== "success") {
        throw new Error("Could not set structural read Raw Values state");
      }
    }
    async function restoreRawValues(value: boolean): Promise<void> {
      let restored = false;
      let restorationError: unknown;
      for (let attempt = 0; attempt < STRUCTURAL.RESTORE_ATTEMPTS && !restored; attempt += 1) {
        try {
          await setRawValues(value);
          restored = true;
        } catch (error) {
          restorationError = error;
        }
      }
      if (!restored) {
        throw Object.assign(new Error("Failed to restore Raw Values after structural read"), {
          cause: restorationError,
          code: TEMPLATE_BASES_RESTORATION_ERROR_CODE,
        } as const) satisfies TemplateBasesRestorationError;
      }
    }
    try {
      await setRawValues(true);
      result = await session.runTask({ taskId: crypto.randomUUID(), type: "get-template-bases", url, requested: item });
    } finally {
      await restoreRawValues(originalRawValues);
    }
    return result;
  }, { signal: session.signal });
}