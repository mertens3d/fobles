import { watchStructuralSettings } from "../../../shared/structural/structural-settings.ts";
import { configureStructuralWorkSession, invalidateStructuralSettings } from "../../foundation/reference-data/processing/item-kind/structural-discovery.ts";
import { handleStructuralDiscoveryError } from "./structural-error-sink.ts";
import { createWorkSession } from "./work-session.ts";

export function registerStructuralWorkSession(): () => void {
  configureStructuralWorkSession(createWorkSession, handleStructuralDiscoveryError);
  return watchStructuralSettings(invalidateStructuralSettings);
}