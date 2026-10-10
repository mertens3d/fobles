import { stripGuidBraces } from "../../features/augmentor/shared/guid";
import type { ParsedDevice } from "./reference-graph.types";
import type { ReferenceGraphControl } from "./reference-graph.types";

export function factoryReferenceGraphControl(control: Element): ReferenceGraphControl {
  return {
    renderingId: control.getAttribute("s:id") ?? "",
    name: undefined,
    path: undefined,
    template: undefined,
    datasource: control.getAttribute("s:ds") ?? undefined,
    datasourceLink: undefined,
    placeholder: control.getAttribute("s:ph") || undefined,
    uid: control.getAttribute("uid") ?? undefined,
    link: undefined,
    parameters: parseParameters(control.getAttribute("s:par") ?? undefined),
  };
}

function parseParameters(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const parameters: Record<string, string> = {};
  raw.split("&").filter(Boolean).forEach((pair) => {
    const separatorIndex = pair.indexOf("=");
    const key = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
    const value = separatorIndex === -1 ? "" : decodeURIComponent(pair.slice(separatorIndex + 1));
    parameters[key] = value;
  });
  return parameters;
}

export function parseDevice(xml: string, deviceId: string): ParsedDevice {
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  const device = Array.from(parsed.getElementsByTagName("d")).find(
    (candidate) => stripGuidBraces(candidate.getAttribute("id")) === stripGuidBraces(deviceId)
  );
  if (!device) return { layoutId: undefined, controls: [] };

  const controls: ReferenceGraphControl[] = Array.from(device.getElementsByTagName("r")).map((control) => (factoryReferenceGraphControl(control)));

  return {
    layoutId: device.getAttribute("l") ?? undefined,
    controls: controls,
  };
}
