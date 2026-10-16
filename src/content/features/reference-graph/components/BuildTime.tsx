// @source-path [fobles] src/content/features/reference-graph/components/BuildTime.tsx

export function BuildTime({ buildElapsedSeconds }: { buildElapsedSeconds: number | undefined; }) {
  return <div className="fobles-reference-graph-build-time">
    {buildElapsedSeconds !== undefined
      ? `Built in ${buildElapsedSeconds.toFixed(3)}s`
      : "Building graph"}
  </div>;
}
