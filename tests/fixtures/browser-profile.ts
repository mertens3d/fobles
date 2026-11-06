import fs from "node:fs";
import path from "node:path";

// Agents: Fresh worker profiles prevent Chromium from reusing an older unpacked extension service worker.
export function createBrowserProfile(workerSlot: number): string {
  const artifactsDir = path.resolve("./playwright/test-artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const userDataDir = fs.mkdtempSync(path.join(artifactsDir, `FoblesTestDirectory${workerSlot}-`));

  const profileDir = path.join(userDataDir, "Default");
  fs.mkdirSync(profileDir, { recursive: true });

  const preferences = { credentials_enable_service: false, profile: { password_manager_enabled: false } } satisfies {
    credentials_enable_service: boolean;
    profile: { password_manager_enabled: boolean };
  };

  fs.writeFileSync(path.join(profileDir, "Preferences"), JSON.stringify(preferences, null, 2), "utf8");

  return userDataDir;
}
