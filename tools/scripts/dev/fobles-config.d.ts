export type FoblesTestUser = {
  name: string;
  nameSecretName?: string;
  passwordSecretName?: string;
};

export type FoblesTestEnvironment = {
  name: string;
  endpoint: string;
  version: string;
  active: boolean;
  testUser?: FoblesTestUser;
};

export type FoblesCliLoginTarget = {
  endpointName: string;
  cmUrl: string;
  authorityUrl: string;
  clientId: string;
  audience?: string;
  asDefault?: boolean;
};

export type FoblesConfig = {
  testEnvironments: FoblesTestEnvironment[];
  cliLoginTargets: FoblesCliLoginTarget[];
};

export function loadFoblesConfig(): FoblesConfig;
export function getTestEnvironments(): FoblesTestEnvironment[];
export function getActiveTestEnvironment(): FoblesTestEnvironment;
export function getCliLoginTargets(): FoblesCliLoginTarget[];
export function getCliLoginTarget(endpointName: string): FoblesCliLoginTarget | undefined;
