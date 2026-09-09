import fs from "node:fs";
import path from "node:path";
import { CONST } from "../CONST";
import type {
  SitecoreEnvironment,
  SitecoreVersion,
  TestEnvironment,
} from "../types";

export function parseSitecoreEnvironments(): SitecoreEnvironment[] {
  const raw = process.env[CONST.ENVIRONMENT.ENV_VAR]?.trim();

  if (!raw) {
    throw new Error(
      `${CONST.ENVIRONMENT.ENV_VAR} is required. Configure it as endpoint|friendlyName|version.`,
    );
  }

  return raw
    .split(/\r?\n|;/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [endpoint, friendlyName, version] = entry
        .split("|")
        .map((part) => part.trim());

      if (!endpoint || !friendlyName || !version) {
        throw new Error(
          `Invalid ${CONST.ENVIRONMENT.ENV_VAR} entry: "${entry}". Use endpoint|friendlyName|version format.`,
        );
      }

      return {
        endpoint,
        friendlyName,
        version: version.toLowerCase() as SitecoreVersion,
      };
    });
}

export function getTestEnvironment(): TestEnvironment {
  const configuredEnvironments = parseSitecoreEnvironments();
  const selected = configuredEnvironments[0];

  return {
    ...selected,
    baseUrl: selected.endpoint,
    loginUrl: selected.endpoint,
  };
}

export function getTestEnvironments(): TestEnvironment[] {
  return parseSitecoreEnvironments().map((environment) => ({
    ...environment,
    baseUrl: environment.endpoint,
    loginUrl: environment.endpoint,
  }));
}

export function ensureAuthDir(): string {
  const authDir =
    process.env[CONST.ENVIRONMENT.AUTH_DIR_ENV_VAR] ??
    CONST.ENVIRONMENT.AUTH_DIR;
  const resolved = path.resolve(authDir);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}
