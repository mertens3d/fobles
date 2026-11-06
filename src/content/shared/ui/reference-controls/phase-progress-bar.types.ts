import type { PhaseProgress } from "../../../foundation/reference-data/progress/lifecycle.types";

export type PhaseProgressBarProps = {
  label: string;
  progress: PhaseProgress | undefined;
  displayLabel?: string;
};