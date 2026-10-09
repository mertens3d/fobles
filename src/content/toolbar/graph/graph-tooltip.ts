import type { TooltipData } from "./graph.types";


export function buildTooltip(
  name: string | undefined,
  guid: string | undefined,
  path: string | undefined,
  placeholder: string | undefined = undefined): TooltipData {
  return { name, guid, path, placeholder };
}
