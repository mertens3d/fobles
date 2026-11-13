// @source-path [fobles] src/content/foundation/reference-data/processing/item-kind/template-structural-service.ts
import { SITECORE } from "../../../../../constants/sitecore.const.ts";
import { ITEM_KIND } from "../../../../../shared/structural/structural.const.ts";
import { getStructuralCacheMaxUnvalidatedAgeMs } from "../../../../runtime-settings/runtime-settings.ts";
import type { StructuralScope, StructuralSettings } from "../../../../../shared/structural/structural.types.ts";
import { extensionLog } from "../../../../logger.ts";
import { classifyItem } from "./classify-item.ts";
import { isWithinSitePath } from "../../../../../shared/known-sites/known-sites-model.ts";
import type { BaseTemplateIdSets } from "./item-kind.types.ts";
import type { StructuralClassification, StructuralDriver, StructuralItem } from "./structural-service.types.ts";

export function createTemplateStructuralService() {
  async function classify(
    item: StructuralItem,
    driver: StructuralDriver,
    settings: StructuralSettings,
    now: number,
    fresh = false,
    scope?: StructuralScope,
  ): Promise<StructuralClassification> {
    const roots = SITECORE.ITEM_KIND.PATH_ROOTS;
    const maxUnvalidatedAgeMs = getStructuralCacheMaxUnvalidatedAgeMs();
    const baseIds: BaseTemplateIdSets = { page: new Set(), site: new Set(), tenant: new Set() };
    let complete = true;
    let stale = false;
    const stamps: string[] = [];
    for (const kind of [ITEM_KIND.PAGE, ITEM_KIND.SITE, ITEM_KIND.TENANT]) {
      const ids = new Set<string>();
      for (const path of settings.baseTemplatePaths[kind]) {
        const resolved = await driver.quickInfo({ kind: "path", value: path }, fresh);
        if (resolved) {
          stale ||= now - resolved.cachedAt >= maxUnvalidatedAgeMs;
          stamps.push(`${kind}:${path}:${resolved.value?.id ?? "not-found"}:${resolved.cachedAt}`);
        }
        if (resolved?.value) {
          ids.add(resolved.value.id);
        } else {
          extensionLog.warn("Structural discovery: configured base root unmatched", {
            scope, target: item, kind, path, reason: resolved === undefined ? "root-unavailable" : "root-not-found", fresh,
          });
          if (resolved === undefined) {
            complete = false;
          }
        }
      }
      baseIds[kind] = ids;
    }
    let templateKind: StructuralClassification["kind"] = ITEM_KIND.UNKNOWN;
    if (item.templateId) {
      const inheritance = await driver.bases(item.templateId, fresh);
      if (inheritance) {
        stamps.push(`${item.templateId}:${inheritance.cachedAt}:${inheritance.value.join("|")}`);
        stale ||= now - inheritance.cachedAt >= maxUnvalidatedAgeMs;
        const inheritedIds = [item.templateId, ...inheritance.value];
        const fingerprint = JSON.stringify([settings.baseTemplatePaths, maxUnvalidatedAgeMs, stamps, complete]);
        const cached = await driver.readDerived(item.templateId);
        if (complete && cached?.value.fingerprint === fingerprint && cached.value.complete) {
          templateKind = cached.value.kind;
        } else {
          templateKind = classifyItem({
            itemPath: roots.CONTENT, inheritedTemplateIds: inheritedIds, baseTemplateIds: baseIds,
            pathRoots: { content: roots.CONTENT, templates: roots.TEMPLATES },
          }).classification;
          if (complete && !stale) {
            await driver.writeDerived(item.templateId, { complete, fingerprint, inheritedIds, kind: templateKind });
          }
        }
      } else {
        complete = false;
        extensionLog.warn("Structural discovery: template inheritance missing", {
          scope, target: item, templateId: item.templateId, reason: "missing-inheritance-tab-data", fresh,
        });
      }
    } else {
      complete = false;
    }
    const kind = isWithinSitePath(item.path, roots.TEMPLATES) ? ITEM_KIND.TEMPLATE
      : isWithinSitePath(item.path, roots.CONTENT) ? templateKind : ITEM_KIND.UNKNOWN;
    return { kind, complete, stale };
  }

  return { classify };
}