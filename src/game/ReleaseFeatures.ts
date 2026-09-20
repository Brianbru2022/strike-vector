export interface ReleaseFeatureInput {
  development: boolean;
  internalToolsBuild: boolean;
  demoBuild?: boolean;
  hostname: string;
  search: string;
}

export interface ReleaseFeatureAccess {
  internalToolsCompiled: boolean;
  localDeveloperHost: boolean;
  diagnostics: boolean;
  validation: boolean;
  authoring: boolean;
}

export function isLocalDeveloperHost(hostname: string): boolean {
  const normalised = hostname.trim().toLowerCase();
  return normalised === 'localhost' || normalised === '127.0.0.1' || normalised === '::1' || normalised === '[::1]';
}

export function deriveReleaseFeatureAccess(input: ReleaseFeatureInput): ReleaseFeatureAccess {
  if (input.demoBuild) return { internalToolsCompiled: false, localDeveloperHost: isLocalDeveloperHost(input.hostname), diagnostics: false, validation: false, authoring: false };
  const internalToolsCompiled = input.development || input.internalToolsBuild;
  const localDeveloperHost = isLocalDeveloperHost(input.hostname);
  const query = new URLSearchParams(input.search);
  const localInternalBuild = input.internalToolsBuild && localDeveloperHost;
  return {
    internalToolsCompiled,
    localDeveloperHost,
    diagnostics: input.development || localInternalBuild,
    validation: input.development || (localInternalBuild && query.get('playtest') === '1'),
    authoring: input.development || (localInternalBuild && query.get('authoring') === '1'),
  };
}

export function normaliseBetaFeedbackUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch { return null; }
}

type BuildImportMeta = ImportMeta & { env?: { DEV?: boolean; VITE_INTERNAL_TOOLS?: string; VITE_DEMO?: string; VITE_ITCH?: string; VITE_BETA_FEEDBACK_URL?: string } };
const buildEnvironment = (import.meta as BuildImportMeta).env;
const developmentBuild = buildEnvironment?.DEV === true;
const internalToolsBuild = buildEnvironment?.VITE_INTERNAL_TOOLS === '1';
export const DEMO_BUILD = buildEnvironment?.VITE_DEMO === '1';
export const ITCH_BUILD = buildEnvironment?.VITE_ITCH === '1';
export const BETA_FEEDBACK_URL = normaliseBetaFeedbackUrl(buildEnvironment?.VITE_BETA_FEEDBACK_URL);

export const INTERNAL_TOOLS_COMPILED = !DEMO_BUILD && (developmentBuild || internalToolsBuild);

export const RELEASE_FEATURES = deriveReleaseFeatureAccess({
  development: developmentBuild,
  internalToolsBuild,
  demoBuild: DEMO_BUILD,
  hostname: typeof window === 'undefined' ? '' : window.location.hostname,
  search: typeof window === 'undefined' ? '' : window.location.search,
});
