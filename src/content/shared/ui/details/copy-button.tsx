// @source-path [fobles] src/content/shared/ui/details/copy-button.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import { DETAILS_PANEL } from "./details-panel.const";

export type CopyButtonProps = { getText: () => string; className?: string };

export function CopyButton({ getText, className = DETAILS_PANEL.CLASS.COPY }: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(resetTimerRef.current), []);

  const handleCopy = useCallback((): void => {
    void navigator.clipboard.writeText(getText()).then(() => setStatus("copied"), () => setStatus("failed")).finally(() => {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => setStatus("idle"), DETAILS_PANEL.COPIED_RESET_MS);
    });
  }, [getText]);

  const label = status === "copied" ? DETAILS_PANEL.TEXT.COPIED : status === "failed" ? "Copy failed" : DETAILS_PANEL.TEXT.COPY;
  return <button type="button" className={className} onClick={handleCopy}>{label}</button>;
}
