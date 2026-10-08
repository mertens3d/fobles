import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// All e2e tests share one persistent browser profile (see tests/e2e/fixtures/playwright.ts).
// An interrupted/crashed run can leave msedge.exe processes running against it, which then
// blocks every later run with "Opening in existing browser session". This finds and kills any
// msedge.exe process whose command line references that profile directory.
const profileDir = path.resolve(
  process.env.PLAYWRIGHT_PROFILE_DIR ?? "./tests/test-artifacts/browser-profile",
);

if (process.platform !== "win32") {
  console.error(
    `This script only supports Windows (uses Get-CimInstance). Find and kill msedge processes referencing ${profileDir} manually.`,
  );
  process.exit(1);
}

// Embedding this filter directly in a `-Command "..."` string breaks on cmd.exe's quote handling
// once double quotes are nested - write a real .ps1 file and run that instead, avoiding all of it.
const script = `
$processes = Get-CimInstance Win32_Process -Filter "name='msedge.exe'" |
  Where-Object { $_.CommandLine -like '*${profileDir.replace(/\\/g, "\\\\")}*' }
$processes | ForEach-Object { $_.ProcessId }
`;
const scriptPath = path.join(os.tmpdir(), `fobles-unlock-browser-profile-${Date.now()}.ps1`);
fs.writeFileSync(scriptPath, script, "utf8");

let output;
try {
  output = execFileSync("powershell", ["-NoProfile", "-File", scriptPath], {
    encoding: "utf8",
  }).trim();
} finally {
  fs.unlinkSync(scriptPath);
}

const pids = output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (pids.length === 0) {
  console.log(`No msedge.exe processes are locking ${profileDir}.`);
  process.exit(0);
}

console.log(`Killing ${pids.length} msedge.exe process(es) locking ${profileDir}: ${pids.join(", ")}`);
for (const pid of pids) {
  try {
    execFileSync("powershell", ["-NoProfile", "-Command", `Stop-Process -Id ${pid} -Force`]);
    console.log(`Killed ${pid}`);
  } catch (error) {
    console.error(`Could not kill ${pid}: ${error.message}`);
  }
}
