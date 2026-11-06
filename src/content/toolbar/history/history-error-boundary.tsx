import { Component, type ErrorInfo } from "react";
import { extensionLog } from "../../logger.ts";
import { HISTORY_CLASS, HISTORY_TEXT, HISTORY_UI } from "./history.const.ts";
import type { HistoryErrorBoundaryProps, HistoryErrorBoundaryState } from "./history-error-boundary.types.ts";

export class HistoryErrorBoundary extends Component<HistoryErrorBoundaryProps, HistoryErrorBoundaryState> {
  state: HistoryErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): HistoryErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    extensionLog.error(HISTORY_UI.ERROR_LOG, error, { componentStack: info.componentStack });
  }

  render() {
    return this.state.failed ? (
      <div role="alert" className={HISTORY_CLASS.ERROR}>{HISTORY_TEXT.ERROR}</div>
    ) : this.props.children;
  }
}