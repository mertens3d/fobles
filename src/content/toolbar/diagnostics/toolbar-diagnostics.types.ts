import type { StructuralSettings } from "../../../shared/structural/structural.types";

export type ToolbarDiagnosticsState = { enabled: boolean };

export type ToolbarDiagnosticsServices = {
  getSettings: () => Promise<StructuralSettings>;
  watchSettings: (listener: (settings: StructuralSettings) => void) => () => void;
};

export type ToolbarDiagnosticsProps = { services?: ToolbarDiagnosticsServices };
