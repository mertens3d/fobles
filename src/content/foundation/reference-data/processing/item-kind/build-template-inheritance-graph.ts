import { stripGuidBraces } from "../../../sitecore/guid.ts";
import { ITEM_KIND_LIMITS } from "./item-kind-limits.const.ts";
import type { FetchDirectBaseTemplates, TemplateIdentity, TemplateInheritanceGraph, TemplateInheritanceNode, TemplateInheritanceWarning } from "./item-kind.types.ts";

export type { FetchDirectBaseTemplates } from "./item-kind.types.ts";

export async function buildTemplateInheritanceGraph(
  rootTemplate: TemplateIdentity,
  fetchDirectBaseTemplates: FetchDirectBaseTemplates,
  maxUniqueTemplates: number = ITEM_KIND_LIMITS.MAX_UNIQUE_TEMPLATES,
): Promise<TemplateInheritanceGraph> {
  const built = new Map<string, TemplateInheritanceNode>();
  const active = new Set<string>();
  const allTemplateIds: string[] = [];
  const warnings: TemplateInheritanceWarning[] = [];
  function limit(): void {
    if (!warnings.some((warning) => warning.kind === "limit-reached")) {
      warnings.push({ kind: "limit-reached", limit: maxUniqueTemplates });
    }
  }
  async function build(template: TemplateIdentity, depth: number): Promise<TemplateInheritanceNode> {
    const id = stripGuidBraces(template.id).trim().toLowerCase();
    let node = built.get(id);
    if (!node) {
      const directBases: TemplateInheritanceNode[] = [];
      node = { template, depth, directBases, unresolved: false };
      if (active.has(id)) {
        warnings.push({ kind: "cycle-detected", template });
      } else if (allTemplateIds.length >= maxUniqueTemplates) {
        limit();
      } else {
        active.add(id);
        allTemplateIds.push(id);
        const bases = await fetchDirectBaseTemplates(template);
        node.unresolved = bases === undefined;
        for (const base of bases ?? []) {
          if (allTemplateIds.length >= maxUniqueTemplates && !built.has(stripGuidBraces(base.id).trim().toLowerCase())) {
            limit();
            break;
          }
          directBases.push(await build(base, depth + 1));
        }
        active.delete(id);
        built.set(id, node);
      }
    }
    return node;
  }
  return { root: await build(rootTemplate, 0), allTemplateIds, warnings };
}