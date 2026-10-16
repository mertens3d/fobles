// @source-path [fobles] src/content/features/reference-graph/reference-graph-timing.ts

const REFERENCE_GRAPH_STARTED_AT_KEY =
  "fobles-reference-graph-started-at";

export function startReferenceGraphTimer(): void {
  sessionStorage.setItem(
    REFERENCE_GRAPH_STARTED_AT_KEY,
    String(performance.timeOrigin + performance.now()),
  );
}

export function finishReferenceGraphTimer():
  number | undefined {
  const rawStartedAt =
    sessionStorage.getItem(
      REFERENCE_GRAPH_STARTED_AT_KEY,
    );

  let elapsedSeconds:
    | number
    | undefined = undefined;

  if (rawStartedAt) {
    const startedAt =
      Number(rawStartedAt);

    if (Number.isFinite(startedAt)) {
      const finishedAt =
        performance.timeOrigin +
        performance.now();

      elapsedSeconds =
        (finishedAt - startedAt) / 1000;
    }
  }

  sessionStorage.removeItem(
    REFERENCE_GRAPH_STARTED_AT_KEY,
  );

  return elapsedSeconds;
}