// @source-path [fobles] src/constants/partials/fobles-workers.const.ts
export const WORKER_POOL = {
  WORKER_IFRAME_CONTAINER_ID: "fobles-worker-iframe-container",
  WORKER_ID_QUERY_PARAMETER: "foblesWorker",
  WORKER_IFRAME_SELECTOR: "iframe[data-worker-id]",
  WORKER_IFRAME_CONTAINER_CLASS: "fobles-worker-iframe-container",
  WORKER_IFRAME_CONTAINER_CLASS_HIDDEN: "fobles-worker-iframe-container--hidden",
  WORKER_IFRAME_CONTAINER_CLASS_VISIBLE: "fobles-worker-iframe-container--visible",
  WORKER_IFRAME_CLASS: "fobles-worker-iframe",
  WORKER_IFRAME_CLASS_HIDDEN: "fobles-worker-iframe--hidden",
  WORKER_IFRAME_CLASS_VISIBLE: "fobles-worker-iframe--visible",
  WORKER_IFRAME_READY_TIMEOUT_MS: 20000,
  WORKER_IFRAME_SEND_RETRY_DELAY_MS: 50,
  WORKER_IFRAME_MAX_SEND_ATTEMPTS: 50,
  MISSING_RECEIVER_ERROR_TEXT: "Receiving end does not exist",
  USE_WORKER_IFRAMES: true,
  POOL_DISPOSAL_TIMEOUT_MS: 10000,
  POOL_DISPOSAL_PROGRESS_INTERVAL_MS: 250,
};
