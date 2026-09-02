export interface ReleaseFileDigestV1 {
  file: string;
  bytes: number;
  sha256: string;
}

export interface ReleaseMigrationCompatibilityV1 {
  campaignSaveVersions: readonly number[];
  currentCampaignSaveVersion: number;
  operationGenerationVersions: readonly number[];
  operationPersistenceVersions: readonly number[];
  saveArchiveVersions: readonly number[];
  demoTransferVersions: readonly number[];
}

export interface ReleaseCandidateManifestV1 {
  format: 'IRON_KESTREL_RELEASE_CANDIDATE_V1';
  generatedAt: string;
  product: "Iron Kestrel '87";
  version: string;
  displayVersion: string;
  buildId: string;
  channel: 'DEVELOPMENT' | 'RELEASE_CANDIDATE';
  releaseEligible: boolean;
  sourceCommit: string | null;
  sourceFingerprint: string;
  assetFingerprint: string;
  claimsFingerprint: string;
  storefrontFingerprint: string;
  evidenceFingerprint: string;
  windowsManifestFingerprint: string;
  migrationCompatibility: ReleaseMigrationCompatibilityV1;
  sourceFiles: ReleaseFileDigestV1[];
  assetFiles: ReleaseFileDigestV1[];
  releaseArtefacts: ReleaseFileDigestV1[];
}

export interface ReleaseDefectV1 {
  id: string;
  severity: 'BLOCKER' | 'MAJOR' | 'MINOR';
  title: string;
  status: 'OPEN' | 'RESOLVED' | 'EXTERNAL' | 'HUMAN_VALIDATION_REQUIRED';
  affectedBuild: string;
  reproduction: string;
  resolution: string | null;
  verificationEvidence: string | null;
}
