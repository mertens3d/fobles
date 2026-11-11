import type { WorkerPoolStatus } from "../../foundation/workers/pool/pool.types";
import type { ActivityEvent, ActivityListener } from "../../shared/activity/activity.types";
import type { StructuralSettings } from "../../../shared/structural/structural.types";

export type ToolbarDiagnosticsState = {
  enabled: boolean;
  activity?: ActivityEvent;
  status?: WorkerPoolStatus;
};

export type ToolbarDiagnosticsServices = {
  getSettings: () => Promise<StructuralSettings>;
  getStatus: () => Promise<WorkerPoolStatus | undefined>;
  subscribe: (listener: ActivityListener) => () => void;
  watchSettings: (listener: (settings: StructuralSettings) => void) => () => void;
};

export type ToolbarDiagnosticsProps = { services?: ToolbarDiagnosticsServices };