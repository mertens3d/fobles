import fs from "node:fs";
import path from "node:path";

export const diagnosticLogPath = path.resolve(
  "./tests/test-artifacts/logs/test-run.log",
);

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
    timestampFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

const originalConsole = {
  error: console.error.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
};

export function appendLogLine(message: string): void {
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

export function installConsoleLogging(): void {
  fs.mkdirSync(path.dirname(diagnosticLogPath), { recursive: true });
  // Preserve the previous run's log (e.g. a stalled run you just killed and re-ran) instead of
  // silently overwriting the only evidence of what happened.
  if (fs.existsSync(diagnosticLogPath)) {
    fs.copyFileSync(diagnosticLogPath, `${diagnosticLogPath}.previous`);
  }
  fs.writeFileSync(
    diagnosticLogPath,
    `Test run started ${formatCentralTimestamp(new Date())}\n`,
    "utf8",
  );

  console.log = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    appendLogLine(message);
    originalConsole.log(...args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    appendLogLine(`[warn] ${message}`);
    originalConsole.warn(...args);
  };

  console.error = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    appendLogLine(`[error] ${message}`);
    originalConsole.error(...args);
  };
}
