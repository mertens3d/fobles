import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import util from "node:util";
import { CONST } from "./e2e/CONST";

const logDirectory = path.resolve("./test-artifacts/logs");
const currentLogPath = path.join(logDirectory, "fobles-test.log");
const backupLogPaths = [
  path.join(logDirectory, "fobles-test.1.log"),
  path.join(logDirectory, "fobles-test.2.log"),
];

const COLORS = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
};

type LogLevel = "info" | "debug" | "step" | "warn" | "error";

type TestLoggerOptions = {
  testName: string;
  retry: number;
  testNumber?: number;
  totalTests?: number;
  sourceLine?: number;
};

const loggerStorage = new AsyncLocalStorage<TestLogger>();
let fallbackLogger: TestLogger | undefined;
let activeLogger: TestLogger | undefined;

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  return util.inspect(value, { colors: false, depth: 5, breakLength: 120 });
}

function rotateLogs(): void {
  fs.mkdirSync(logDirectory, { recursive: true });
  for (let index = backupLogPaths.length - 1; index >= 0; index -= 1) {
    const source = index === 0 ? currentLogPath : backupLogPaths[index - 1];
    const destination = backupLogPaths[index];
    if (fs.existsSync(destination)) fs.rmSync(destination);
    if (fs.existsSync(source)) fs.renameSync(source, destination);
  }
  fs.writeFileSync(currentLogPath, "", "utf8");
}

function appendLine(line: string): void {
  fs.appendFileSync(currentLogPath, `${line}\n`, "utf8");
}

export class TestLogger {
  private indentLevel = 0;

  public constructor(private readonly options: TestLoggerOptions) {}

  public startTest(): void {
    const testNumber = this.options.testNumber === undefined
      ? ""
      : ` ${this.options.testNumber}${this.options.totalTests === undefined ? "" : ` of ${this.options.totalTests}`}`;
    const sourceLine = this.options.sourceLine === undefined
      ? ""
      : ` (source line ${this.options.sourceLine})`;
    const line = [
      "",
      "==========================================",
      `Test${testNumber}${sourceLine}: ${this.options.testName} (retry ${this.options.retry})`,
      "==========================================",
    ].join("\n");
    appendLine(line);
    process.stderr.write(`${line}\n`);
    this.indentLevel = 2;
  }

  public info(message: string, details?: unknown): void {
    this.write("info", this.withDetails(message, details));
  }

  public debug(message: string, details?: unknown): void {
    this.write("debug", this.withDetails(message, details));
  }

  public step(message: string, details?: unknown): void {
    this.write("step", this.withDetails(message, details));
  }

  public waitFor(target: string, maxMs: number): void {
    this.step(`Waiting max ${formatWait(maxMs)} for '${target}'`);
  }

  public pause(milliseconds: number): void {
    this.step(`Waiting ${formatWait(milliseconds)}`);
  }

  public warn(message: string, details?: unknown): void {
    this.write("warn", this.withDetails(message, details));
  }

  public error(message: string, details?: unknown): void {
    this.write("error", this.withDetails(message, details));
  }

  public browserError(message: string): void {
    if (this.isIgnoredBrowserError(message)) return;
    this.error(message);
  }

  public browserWarning(message: string): void {
    if (this.isIgnoredBrowserError(message)) return;
    this.warn(message);
  }

  private isIgnoredBrowserError(message: string): boolean {
    return CONST.LOGGING.IGNORED_BROWSER_ERRORS.some((ignored) =>
      message.includes(ignored),
    );
  }

  private withDetails(message: string, details?: unknown): string {
    return details === undefined ? message : `${message} ${formatValue(details)}`;
  }

  private write(level: LogLevel, message: string): void {
    const marker = level === "step" ? "-" : level.toUpperCase();
    const indent = "  ".repeat(this.indentLevel + (level === "debug" ? 1 : 0));
    const line = `${indent}${marker} ${message}`;
    appendLine(line);

    const color =
      level === "error"
        ? COLORS.red
        : level === "warn"
          ? COLORS.yellow
          : level === "debug"
            ? COLORS.dim
            : level === "step"
              ? COLORS.cyan
              : "";
    process.stderr.write(`${color}${line}${COLORS.reset}\n`);
  }
}

export function startTestLogger(options: TestLoggerOptions): TestLogger {
  const logger = new TestLogger(options);
  return logger;
}

export function runWithTestLogger<T>(
  logger: TestLogger,
  callback: () => Promise<T>,
): Promise<T> {
  return loggerStorage.run(logger, callback);
}

export function setActiveTestLogger(logger: TestLogger | undefined): void {
  activeLogger = logger;
}

export const testLogger = {
  startTest(): void {
    getLogger().startTest();
  },
  info(message: string, details?: unknown): void {
    getLogger().info(message, details);
  },
  debug(message: string, details?: unknown): void {
    getLogger().debug(message, details);
  },
  step(message: string, details?: unknown): void {
    getLogger().step(message, details);
  },
  waitFor(target: string, maxMs: number): void {
    getLogger().waitFor(target, maxMs);
  },
  pause(milliseconds: number): void {
    getLogger().pause(milliseconds);
  },
  warn(message: string, details?: unknown): void {
    getLogger().warn(message, details);
  },
  error(message: string, details?: unknown): void {
    getLogger().error(message, details);
  },
  browserWarning(message: string): void {
    getLogger().browserWarning(message);
  },
};

function formatWait(milliseconds: number): string {
  if (milliseconds % 1_000 === 0) return `${milliseconds / 1_000}s`;
  return `${milliseconds}ms`;
}

function getLogger(): TestLogger {
  const logger = loggerStorage.getStore() ?? activeLogger ?? fallbackLogger;
  if (logger) return logger;
  fallbackLogger = fallbackLogger ?? startTestLogger({ testName: "outside test", retry: 0 });
  return fallbackLogger;
}

export function initializeTestLogging(): void {
  if (process.env.TEST_WORKER_INDEX && process.env.TEST_WORKER_INDEX !== "0") {
    return;
  }
  rotateLogs();
  appendLine("Testing Started");
  process.stderr.write("Testing Started\n");
}

export const diagnosticLogPath = currentLogPath;

export function logDiagnostic(message: string): void {
  testLogger.error(message);
}
