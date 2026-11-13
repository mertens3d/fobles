// @source-path [fobles] src/content/shell/worker-iframes/worker-iframe-window.tsx

import { useEffect, useRef } from "react";
import { CONST } from "../../../constants/const";
import { getRuntimeSettings } from "../../runtime-settings/runtime-settings";
import { FoblesWindow } from "../../shared/dialog/fobles-window";

const WORKER_POOL = CONST.FOBLES.WORKER_POOL;

export function WorkerIframeWindow() {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const shouldHide = getRuntimeSettings().workerPool.hideWorkerIframes;

  useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return undefined;
    }
    const existing = document.getElementById(WORKER_POOL.WORKER_IFRAME_CONTAINER_ID);
    const container = existing instanceof HTMLDivElement ? existing : document.createElement("div");
    container.id = WORKER_POOL.WORKER_IFRAME_CONTAINER_ID;
    container.classList.add(WORKER_POOL.WORKER_IFRAME_CONTAINER_CLASS);
    container.classList.remove(WORKER_POOL.WORKER_IFRAME_CONTAINER_CLASS_HIDDEN);
    container.classList.add(WORKER_POOL.WORKER_IFRAME_CONTAINER_CLASS_VISIBLE);
    content.appendChild(container);
    return () => {
      if (container.isConnected && container.parentElement === content) {
        document.body.appendChild(container);
      }
    };
  }, []);

  if (shouldHide) {
    return null;
  }

  return <FoblesWindow id="fobles-worker-iframes" className="fobles-worker-iframe-window" title="Worker Iframes" storageKey="fobles.window.worker-iframes"
    defaultWidth={760} defaultHeight={620} minWidth={420} minHeight={260}>
    <div ref={contentRef} className="fobles-worker-iframe-window-content" />
  </FoblesWindow>;
}
