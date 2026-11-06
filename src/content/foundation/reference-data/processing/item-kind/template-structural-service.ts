import { SITECORE } from "../../../../../constants/sitecore.ts";
import { ITEM_KIND } from "../../../../../shared/structural/structural.const.ts";
import { getRuntimeSettings } from "../../../../runtime-settings/runtime-settings.ts";
import type { StructuralScope, StructuralSettings } from "../../../../../shared/structural/structural.types.ts";
import { extensionLog } from "../../../../logger.ts";
import { buildTemplateInheritanceGraph } from "./build-template-inheritance-graph.ts";
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
    const maxUnvalidatedAgeMs = getRuntimeSettings().structuralCache.maxUnvalidatedAgeMs;
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
      const graph = await buildTemplateInheritanceGraph({ id: item.templateId }, async (template) => {
        const fact = await driver.bases(template.id, fresh);
        if (fact) {
          stamps.push(`${template.id}:${fact.cachedAt}:${fact.value.join("|")}`);
          stale ||= now - fact.cachedAt >= maxUnvalidatedAgeMs;
        } else {
          extensionLog.warn("Structural discovery: direct bases missing", {
            scope, target: item, templateId: template.id, reason: "missing-direct-bases", fresh,
          });
        }
        return fact?.value.map((id) => ({ id }));
      });
      const unresolved = (node: typeof graph.root, visited = new Set<string>()): boolean => {
        let missing = node.unresolved;
        if (!visited.has(node.template.id)) {
          visited.add(node.template.id);
          missing ||= node.directBases.some((base) => unresolved(base, visited));
        }
        return missing;
      };
      complete &&= !unresolved(graph.root) && !graph.warnings.some((warning) => warning.kind === "limit-reached");
      const fingerprint = JSON.stringify([settings.baseTemplatePaths, maxUnvalidatedAgeMs, stamps, complete]);
      const cached = await driver.readDerived(item.templateId);
      if (complete && cached?.value.fingerprint === fingerprint && cached.value.complete) {
        templateKind = cached.value.kind;
      } else {
        const inheritedIds = graph.allTemplateIds;
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
    }
    const kind = isWithinSitePath(item.path, roots.TEMPLATES) ? ITEM_KIND.TEMPLATE
      : isWithinSitePath(item.path, roots.CONTENT) ? templateKind : ITEM_KIND.UNKNOWN;
    return { kind, complete, stale };
  }

  return { classify };
}