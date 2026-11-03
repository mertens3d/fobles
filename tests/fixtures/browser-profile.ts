import fs from "node:fs";
import path from "node:path";

// Create a fresh profile for each worker, preserving the previous behavior of
// launchPersistentContext(""). Write preferences before Chromium opens it.
export function createBrowserProfile(workerSlot: number): string {
  const userDataDir = path.resolve("./playwright/test-artifacts", `FoblesTestDirectory${workerSlot}`);

  const profileDir = path.join(userDataDir, "Default");
  fs.mkdirSync(profileDir, { recursive: true });

  const preferences = { credentials_enable_service: false, profile: { password_manager_enabled: false } } satisfies {
    credentials_enable_service: boolean;
    profile: { password_manager_enabled: boolean };
  };

  fs.writeFileSync(path.join(profileDir, "Preferences"), JSON.stringify(preferences, null, 2), "utf8");

  return userDataDir;
}
