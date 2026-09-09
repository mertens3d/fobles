import fs from "node:fs";
import path from "node:path";

export const diagnosticLogPath = path.resolve(
  "./test-artifacts/logs/test-run.log",
);

const originalConsole = {
  error: console.error.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
};

export function appendLogLine(message: string): void {
  fs.appendFileSync(
    diagnosticLogPath,
    `[${new Date().toISOString()}] ${message}\n`,
    "utf8",
  );
}

export function logDiagnostic(message: string): void {
  appendLogLine(message);
  originalConsole.error(message);
}

export function installConsoleLogging(): void {
  fs.mkdirSync(path.dirname(diagnosticLogPath), { recursive: true });
  fs.writeFileSync(
    diagnosticLogPath,
    `Test run started ${new Date().toISOString()}\n`,
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
