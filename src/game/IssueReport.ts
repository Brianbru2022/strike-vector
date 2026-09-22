import { CampaignSave, DiagnosticSession, DiagnosticSessionV1, DiagnosticSessionV2, DiagnosticSessionV3, InputDevice, IssueReportV1, OperationRunState, PerformanceSnapshot } from '../types/game';
import { sanitiseDiagnosticSession } from './Diagnostics';
import { RELEASE_INFO } from './Release';

export interface IssueReportRuntimeInput {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  online: boolean;
  standalone: boolean;
  inputDevice: InputDevice;
}

export const buildIssueReport = (
  campaign: CampaignSave,
  diagnostics: Array<DiagnosticSessionV1 | DiagnosticSessionV2 | DiagnosticSessionV3 | DiagnosticSession>,
  performance: PerformanceSnapshot | null,
  operation: OperationRunState | null,
  runtime: IssueReportRuntimeInput,
  generatedAt = new Date().toISOString(),
): IssueReportV1 => ({
  version: 1,
  release: { version: RELEASE_INFO.version, buildId: RELEASE_INFO.buildId, channel: RELEASE_INFO.channel },
  generatedAt,
  runtime: {
    viewport: {
      width: Math.max(1, Math.round(runtime.viewportWidth)),
      height: Math.max(1, Math.round(runtime.viewportHeight)),
      devicePixelRatio: Math.max(1, Math.min(4, Number(runtime.devicePixelRatio) || 1)),
    },
    online: Boolean(runtime.online),
    standalone: Boolean(runtime.standalone),
    inputDevice: runtime.inputDevice,
  },
  campaign: {
    saveVersion: campaign.version,
    activeChapter: campaign.activeChapter,
    completedMissionCount: campaign.completedMissionIds.length,
    difficulty: campaign.difficulty,
    renderQuality: campaign.renderQuality,
    accessibility: { ...campaign.accessibility },
  },
  operation: {
    active: Boolean(operation),
    generationVersion: operation?.blueprint.version ?? null,
    sortieIndex: operation?.currentSortieIndex ?? null,
  },
  performance: performance ? { ...performance } : null,
  recentDiagnostics: diagnostics.slice(-20).map(sanitiseDiagnosticSession).filter((item): item is DiagnosticSession => item !== null).map((item) => {
    const { operationSeed: _operationSeed, ...safeDiagnostic } = item;
    return safeDiagnostic;
  }),
});

export const exportIssueReportJson = (report: IssueReportV1): string => JSON.stringify(report, null, 2);
