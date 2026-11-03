// @source-path [Fobles] tests/fixtures/playwright-logging.ts

import fs from "node:fs";
import path from "node:path";

// Each worker process has its own instance of this module.
export let diagnosticLogPath: string | undefined;

const timestampFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatCentralTimestamp(date: Date): string {
  const parts = Object.fromEntries(
    timestampFormatter.formatToParts(date).map((part) => [
      part.type,
      part.value,
    ]),
  );

  return `${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

const originalConsole = {
  error: console.error.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
};

export function appendLogLine(message: string): void {
  if (!diagnosticLogPath) {
    throw new Error(
      "Call installConsoleLogging(workerSlot) before writing logs.",
    );
  }

  fs.appendFileSync(
    diagnosticLogPath,
    `[${formatCentralTimestamp(new Date())}] ${message}\n`,
    "utf8",
  );
}

export function logDiagnostic(message: string): void {
  appendLogLine(message);
  originalConsole.error(message);
}

export function installConsoleLogging(workerSlot: number): void {
  const logPath = path.resolve(
    "./playwright/test-artifacts/logs",
    `worker-${workerSlot}`,
    "test-run.log",
  );

  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  // Preserve the previous log for this worker slot.
  if (fs.existsSync(logPath)) {
    fs.copyFileSync(logPath, `${logPath}.previous`);
  }

  fs.writeFileSync(
    logPath,
    `Test run started ${formatCentralTimestamp(new Date())}\n`,
    "utf8",
  );

  diagnosticLogPath = logPath;

  console.log = (...args: unknown[]): void => {
    appendLogLine(args.map(String).join(" "));
    originalConsole.log(...args);
  };

  console.warn = (...args: unknown[]): void => {
    appendLogLine(`[warn] ${args.map(String).join(" ")}`);
    originalConsole.warn(...args);
  };

  console.error = (...args: unknown[]): void => {
    appendLogLine(`[error] ${args.map(String).join(" ")}`);
    originalConsole.error(...args);
  };
}