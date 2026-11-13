// @source-path [fobles] src/options/persisted-logs/persisted-logs-section.tsx

import { useEffect, useRef, useState } from "react";
import { CONST } from "../../constants/const";
import { LOGGER } from "../../constants/extension.const";
import { downloadSanitizedTextZip } from "../../shared/export/zip-export";
import { copySanitizedText } from "../../shared/export/text-export";
import { clearPersistedLogEntries, getPersistedLogEntries } from "../../shared/logging/persisted-log-storage";
import type { PersistedLogEntry } from "../../shared/persisted-log.types";

const COPIED_FEEDBACK_MS = 1500;

function logTimeStamp(timestamp: Date): string {
  return `${String(timestamp.getMinutes()).padStart(2, "0")}:${String(timestamp.getSeconds()).padStart(2, "0")}`;
}

function splitEntryArgs(args: readonly unknown[]): { primitives: string[]; objects: unknown[] } {
  const primitives: string[] = [];
  const objects: unknown[] = [];
  args.forEach((arg) => (arg !== null && typeof arg === "object" ? objects.push(arg) : primitives.push(String(arg))));
  return { primitives, objects };
}

function formatPersistedLogs(entries: readonly PersistedLogEntry[]): string {
  if (entries.length === 0) {
    return "No persisted logs.";
  }
  return entries
    .map((entry) => {
      const { primitives, objects } = splitEntryArgs(entry.args);
      const line = `${logTimeStamp(new Date(entry.timestamp))} [${entry.level}] [${entry.context}] ${LOGGER.NAMESPACE}${primitives.length > 0 ? ` ${primitives.join(" ")}` : ""}`;
      const details = objects.map((value) =>
        JSON.stringify(value, null, 2)
          .split("\n")
          .map((detailLine) => `  ${detailLine}`)
          .join("\n"),
      );
      return [line, ...details].join("\n");
    })
    .join("\n");
}

function PersistedLogObject({ value }: { value: unknown }) {
  return (
    <details className="persisted-log-object">
      <summary>{Array.isArray(value) ? `Array(${value.length})` : "Object"}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function PersistedLogRow({ entry }: { entry: PersistedLogEntry }) {
  const { primitives, objects } = splitEntryArgs(entry.args);
  return (
    <div className={`persisted-log-entry persisted-log-${entry.level}`}>
      <div className="persisted-log-line">
        <span className="persisted-log-prefix">{`${logTimeStamp(new Date(entry.timestamp))} [${entry.level}] [${entry.context}] ${LOGGER.NAMESPACE}`}</span>
        <span className="persisted-log-message">{primitives.length > 0 ? ` ${primitives.join(" ")}` : ""}</span>
      </div>
      {objects.map((value, index) => (
        <PersistedLogObject key={index} value={value} />
      ))}
    </div>
  );
}

export function PersistedLogsSection() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<readonly PersistedLogEntry[]>();
  const [copyLabel, setCopyLabel] = useState("Copy Logs");
  const [copySanitizedLabel, setCopySanitizedLabel] = useState("Copy Sanitized Logs");
  const outputRef = useRef<HTMLDivElement>(null);

  async function refresh(): Promise<void> {
    setEntries(await getPersistedLogEntries());
  }

  useEffect(() => {
    if (window.location.hash === "#persisted-logs") {
      setOpen(true);
      void refresh();
    }
  }, []);

  function handleToggle(event: React.SyntheticEvent<HTMLDetailsElement>): void {
    const isOpen = event.currentTarget.open;
    setOpen(isOpen);
    if (isOpen) {
      void refresh();
    }
  }

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(formatPersistedLogs(entries ?? []));
    setCopyLabel("Copied!");
    window.setTimeout(() => setCopyLabel("Copy Logs"), COPIED_FEEDBACK_MS);
  }

  async function handleCopySanitized(): Promise<void> {
    await copySanitizedText(formatPersistedLogs(entries ?? []));
    setCopySanitizedLabel("Copied!");
    window.setTimeout(() => setCopySanitizedLabel("Copy Sanitized Logs"), COPIED_FEEDBACK_MS);
  }

  function handleDownloadZip(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadSanitizedTextZip(
      document,
      [{ path: "logs/persisted-logs.txt", content: formatPersistedLogs(entries ?? []) }],
      `fobles-logs-for-ai-${timestamp}.zip.txt`,
    );
  }

  function handleScrollToBottom(): void {
    outputRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  async function handleClear(): Promise<void> {
    await clearPersistedLogEntries();
    setEntries([]);
  }

  return (
    <details
      id={CONST.FOBLES.OPTIONS_PAGE.PERSISTED_LOGS_SECTION}
      className="settings-section"
      open={open}
      onToggle={handleToggle}
    >
      <summary>Persisted Logs</summary>
      <div className="settings-actions">
        <button
          id={CONST.FOBLES.OPTIONS_PAGE.REFRESH_PERSISTED_LOGS}
          type="button"
          className="settings-button"
          onClick={() => void refresh()}
        >
          Refresh
        </button>
        <button
          id={CONST.FOBLES.OPTIONS_PAGE.CLEAR_PERSISTED_LOGS}
          type="button"
          className="settings-button"
          onClick={() => void handleClear()}
        >
          Clear Logs
        </button>
        <button
          id={CONST.FOBLES.OPTIONS_PAGE.COPY_PERSISTED_LOGS}
          type="button"
          className="settings-button"
          onClick={() => void handleCopy()}
        >
          {copyLabel}
        </button>
        <button
          type="button"
          className="settings-button"
          title="Copies logs after redacting credentials and environment-sensitive values."
          onClick={() => void handleCopySanitized()}
        >
          {copySanitizedLabel}
        </button>
        <button
          type="button"
          className="settings-button"
          title="Downloads sanitized logs as a ZIP with a .txt suffix for easier AI attachment."
          onClick={handleDownloadZip}
        >
          Download Logs for AI
        </button>
        <button
          id={CONST.FOBLES.OPTIONS_PAGE.SCROLL_PERSISTED_LOGS_BOTTOM}
          type="button"
          className="settings-button"
          onClick={handleScrollToBottom}
        >
          Scroll to Bottom
        </button>
      </div>
      <div id={CONST.FOBLES.OPTIONS_PAGE.PERSISTED_LOGS_OUTPUT} ref={outputRef}>
        {!entries || entries.length === 0
          ? "No persisted logs."
          : entries.map((entry) => <PersistedLogRow key={entry.id} entry={entry} />)}
      </div>
    </details>
  );
}
