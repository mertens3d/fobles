#!/usr/bin/env node

import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { promptForSuffix } from "./sitecore-cli-target-prompt.js";
import { getTestEnvironments } from "./fobles-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, "secure-secret.ps1");

function runPowerShell(action, name, options = {}) {
  return spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Action", action, "-Name", name],
    { encoding: "utf8", ...options },
  );
}

// Windows-only, DPAPI-backed (see secure-secret.ps1) - undefined on any other platform or when
// nothing has been stored yet, so callers decide their own fallback (e.g. a manual-login prompt).
export function getSecureSecret(name) {
  if (process.platform !== "win32") return undefined;
  const result = runPowerShell("Get", name);
  if (result.status !== 0) return undefined;
  return result.stdout.trim() || undefined;
}

// Every *SecretName fobles.environments.json already references, deduped - so `secret:set` can
// prompt from real names instead of requiring one typed out by hand.
function knownSecretNames() {
  const names = getTestEnvironments().flatMap((environment) => {
    const testUser = environment.testUser;
    return testUser ? [testUser.nameSecretName, testUser.passwordSecretName] : [];
  });
  return [...new Set(names.filter(Boolean))];
}

// Masked input read entirely in this one process - Ctrl+C/Escape are handled directly here rather
// than depending on console-signal propagation into a nested PowerShell child (which turned out to
// be unreliable). Resolves the typed value; Ctrl+C/Escape print "Cancelled." and exit (130/0).
function promptForSecretValue(promptText) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("Setting a secret requires an interactive terminal."));
      return;
    }

    process.stdout.write(promptText);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          console.log("\nCancelled.");
          process.exit(130);
        }
        if (char === "\u001b") {
          cleanup();
          console.log("\nCancelled.");
          process.exit(0);
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (char >= " ") {
          value += char;
          process.stdout.write("*");
        }
      }
    };

    stdin.on("data", onData);
  });
}

const isMain = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const command = args[0];
  let name = args[1];
  const action = { set: "Set", get: "Get", remove: "Remove" }[command];

  if (!action) {
    console.error("Usage: node secure-secret-store.js <set|get|remove> <NAME>");
    process.exit(1);
  }

  if (!name && process.stdin.isTTY) {
    const entries = knownSecretNames().map((secretName) => ({ suffix: secretName, label: secretName }));
    if (entries.length > 0) name = await promptForSuffix(entries, { message: "Which secret (e.g. a CMS test user's password)?" });
  }

  if (!name) {
    console.error("Usage: node secure-secret-store.js <set|get|remove> <NAME>");
    console.error("No fobles.environments.json testUser secret names to prompt from - pass a NAME directly.");
    process.exit(1);
  } else if (action === "Set") {
    let value;
    try {
      value = await promptForSecretValue(`Enter value for ${name}: `);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
    // Piped via stdin (not a CLI arg, not inherited console) - the value never appears in argv/shell
    // history, and secure-secret.ps1 just reads one line non-interactively and encrypts it.
    const result = runPowerShell("Set", name, { input: `${value}\n` });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  } else if (action === "Get") {
    const value = getSecureSecret(name);
    if (!value) {
      console.error(`No secure secret stored for "${name}".`);
      process.exit(1);
    }
    console.log(value);
  } else {
    process.exit(runPowerShell("Remove", name).status ?? 0);
  }
}
