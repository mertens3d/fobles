import type { StructuralAction } from "../../shared/structural/structural-command.types.ts";
import { STRUCTURAL_COMMAND } from "../../shared/structural/structural.const.ts";
import type { StructuralScope } from "../../shared/structural/structural.types.ts";
import type { StructuralMaintenanceDependencies } from "./structural-command.types.ts";

export async function maintainStructuralScope(action: StructuralAction, scope: StructuralScope, deps: StructuralMaintenanceDependencies): Promise<number> {
  let scheduled = 0;
  deps.assertScope(scope);
  await deps.invalidateScope(scope, async () => {
    deps.assertScope(scope);
    const rediscover = action === STRUCTURAL_COMMAND.ACTION.REDISCOVER;
    const sites = rediscover ? await deps.readSites(scope) : [];
    const visits = rediscover ? await deps.readHistory(scope) : [];
    deps.assertScope(scope);
    await deps.invalidateCache(scope);
    deps.assertScope(scope);
    await deps.invalidateSites(scope);
    if (rediscover) {
      deps.assertScope(scope);
      scheduled = deps.rediscover(scope, sites, visits);
    }
  });
  return scheduled;
}