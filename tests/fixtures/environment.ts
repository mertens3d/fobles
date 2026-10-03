import fs from "node:fs";
import path from "node:path";
import { CONST } from "../CONST";
import {
  getActiveTestEnvironment as getActiveConfigEnvironment,
  getTestEnvironments as getConfigEnvironments,
} from "../../tools/scripts/dev/fobles-config.js";
import { getSecureSecret } from "../../tools/scripts/dev/secure-secret-store.js";
import { Secret } from "./secret";
import type {
  SitecoreEnvironment,
  TestEnvironment,
} from "./sitecore-environment.types";

function toSitecoreEnvironment(entry: {
  endpoint: string;
  name: string;
  version: string;
}): SitecoreEnvironment {
  return {
    endpoint: entry.endpoint,
    friendlyName: entry.name,
    version: entry.version.toLowerCase() as SitecoreEnvironment["version"],
  };
}

function toTestEnvironment(entry: { endpoint: string; name: string; version: string }): TestEnvironment {
  const environment = toSitecoreEnvironment(entry);
  return { ...environment, baseUrl: environment.endpoint, loginUrl: environment.endpoint };
}

export function getTestEnvironment(): TestEnvironment {
  return toTestEnvironment(getActiveConfigEnvironment());
}

export function getTestEnvironments(): TestEnvironment[] {
  return getConfigEnvironments().map(toTestEnvironment);
}

export type TestUserCredentials = { username?: string; password?: Secret };

// Resolves the active environment's testUser - a literal "name" is used as-is; *SecretName fields
// look the value up in the DPAPI secure secret store (npm run secret:set) instead. Passwords are
// never stored in fobles.environments.json itself - only referenced there by secret name.
export function getActiveTestUserCredentials(): TestUserCredentials {
  const testUser = getActiveConfigEnvironment().testUser;
  if (!testUser) return {};

  const rawPassword = testUser.passwordSecretName ? getSecureSecret(testUser.passwordSecretName) : undefined;
  return {
    username: testUser.nameSecretName ? getSecureSecret(testUser.nameSecretName) : testUser.name,
    password: rawPassword ? new Secret(rawPassword) : undefined,
  };
}

export function ensureAuthDir(): string {
  const authDir =
    process.env[CONST.ENVIRONMENT.AUTH_DIR_ENV_VAR] ??
    CONST.ENVIRONMENT.AUTH_DIR;
  const resolved = path.resolve(authDir);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}
