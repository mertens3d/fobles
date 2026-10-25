import type { SitecoreDataFactName } from "../../sitecore-data-cache/sitecore-data-cache.types";
import type { WorkerTask } from "../../foundation/workers/tasks/worker-task.types";

const READ_LABEL_BY_KIND: Readonly<Record<SitecoreDataFactName, string>> = {
  quickInfo: "Reading Quick Info",
  parent: "Reading Parent",
  children: "Reading Children",
  referrers: "Reading Referrers",
  customSections: "Reading Custom Fields",
  standardSections: "Reading Standard Fields",
  layout: "Reading Layout",
};

export function labelForFact(factName: SitecoreDataFactName): string {
  return READ_LABEL_BY_KIND[factName];
}

export function labelForWorkerTask(task: WorkerTask): string {
  switch (task.type) {
    case "get-quick-info": return READ_LABEL_BY_KIND.quickInfo;
    case "get-parent": return READ_LABEL_BY_KIND.parent;
    case "get-children": return READ_LABEL_BY_KIND.children;
    case "get-referrers": return READ_LABEL_BY_KIND.referrers;
    case "get-custom-fields": return READ_LABEL_BY_KIND.customSections;
    case "get-standard-fields": return READ_LABEL_BY_KIND.standardSections;
    case "get-layout": return READ_LABEL_BY_KIND.layout;
    case "set-raw-values": return `Turning Raw Values: ${task.value ? "On" : "Off"}`;
    case "set-standard-fields": return `Turning Standard Fields: ${task.value ? "On" : "Off"}`;
  }
}
