// @source-path [fobles] src/content/foundation/reference-data/processing/classification/build-template-inheritance-graph.ts

import { stripGuidBraces } from "../../../sitecore/guid.ts";
import { CLASSIFICATION_LIMITS } from "./classification-limits.const.ts";
import type {
  TemplateIdentity,
  TemplateInheritanceGraph,
  TemplateInheritanceNode,
  TemplateInheritanceWarning,
} from "./item-classification.types.ts";

// Returns undefined when the template itself could not be resolved/fetched at all (missing or
// unresolvable), as opposed to an empty array (a template with no base templates).
export type FetchDirectBaseTemplates = (template: TemplateIdentity) => Promise<readonly TemplateIdentity[] | undefined>;

function normalizeId(id: string): string {
  return stripGuidBraces(id).toLowerCase();
}

// One shared inheritance service - classification, Site/Tenant ancestor lookup, and Standard
// Values all walk the SAME graph produced here rather than each re-implementing the traversal.
export async function buildTemplateInheritanceGraph(
  rootTemplate: TemplateIdentity,
  fetchDirectBaseTemplates: FetchDirectBaseTemplates,
  maxUniqueTemplates: number = CLASSIFICATION_LIMITS.MAX_UNIQUE_TEMPLATES,
): Promise<TemplateInheritanceGraph> {
  const builtByNormalizedId = new Map<string, TemplateInheritanceNode>();
  const inProgress = new Set<string>();
  const allTemplateIds: string[] = [];
  const warnings: TemplateInheritanceWarning[] = [];
  let limitWarningRecorded = false;

  function recordLimitReached(): void {
    if (limitWarningRecorded) {
      return;
    }
    limitWarningRecorded = true;
    warnings.push({ kind: "limit-reached", limit: maxUniqueTemplates });
  }

  async function build(template: TemplateIdentity, depth: number): Promise<TemplateInheritanceNode> {
    const normalizedId = normalizeId(template.id);
    const existing = builtByNormalizedId.get(normalizedId);
    if (existing) {
      return existing;
    }

    if (inProgress.has(normalizedId)) {
      warnings.push({ kind: "cycle-detected", template });
      return { template, depth, directBases: [], unresolved: false };
    }

    if (allTemplateIds.length >= maxUniqueTemplates) {
      recordLimitReached();
      return { template, depth, directBases: [], unresolved: false };
    }

    inProgress.add(normalizedId);
    allTemplateIds.push(normalizedId);

    const directBaseTemplates = await fetchDirectBaseTemplates(template);
    const unresolved = directBaseTemplates === undefined;
    const directBases: TemplateInheritanceNode[] = [];
    if (directBaseTemplates !== undefined) {
      for (const base of directBaseTemplates) {
        if (allTemplateIds.length >= maxUniqueTemplates && !builtByNormalizedId.has(normalizeId(base.id))) {
          recordLimitReached();
          break;
        }
        directBases.push(await build(base, depth + 1));
      }
    }

    inProgress.delete(normalizedId);
    const node: TemplateInheritanceNode = { template, depth, directBases, unresolved };
    builtByNormalizedId.set(normalizedId, node);
    return node;
  }

  const root = await build(rootTemplate, 0);
  return { root, allTemplateIds, warnings };
}
