import { describe, expect, it } from 'vitest';
import type { DiagnosticSessionV3, PerformanceSnapshot } from '../types/game';
import { createDefaultCampaignSave, sanitiseCampaignSave } from './Campaign';
import { generateOperation, generateOperationMission } from './DynamicOperations';
import { buildIssueReport, exportIssueReportJson } from './IssueReport';
import { CAMPAIGN_MISSIONS } from './Missions';
import { RELEASE_INFO } from './Release';

const diagnostic = (missionId: string): DiagnosticSessionV3 => ({
  version: 3,
  missionId,
  difficulty: 'PILOT',
  simulationTicks: 1200,
  result: 'VICTORY',
  completedObjectiveIds: ['primary'],
  deathCause: null,
  weaponsUsed: { CANNON: 20, MISSILE: 1, BOMB: 0, ROCKET: 0, FLARE: 1 },
  landingGrade: 'SAFE',
  tutorialStepsCompleted: 9,
  tutorialSkipped: false,
  operationSeed: null,
  operationArchetype: null,
  operationSortieIndex: null,
  operationRetryCount: 0,
  damageReceived: { AIRCRAFT_GUN: 0, SAM_MISSILE: 0, FLAK: 0, GROUND_FIRE: 0, IMPACT: 0 },
  weaponHits: { CANNON: 8, MISSILE: 1, BOMB: 0, ROCKET: 0 },
  enemyAircraftDestroyed: 1,
  missileWarnings: 1,
  warningAcknowledgements: 1,
  countermeasureSuccesses: 1,
  combatTicks: 900,
  aircraftLossPhase: 'NONE',
});

describe('1.0 release-candidate contracts', () => {
  it('freezes one release identity and the sixteen authored campaign missions', () => {
    expect(RELEASE_INFO).toMatchObject({ version: '1.2.0-beta.1', saveVersion: 4, campaignMissionCount: 16, operationGenerationVersions: [1, 2, 3] });
    expect(CAMPAIGN_MISSIONS).toHaveLength(16);
    expect(new Set(CAMPAIGN_MISSIONS.map((mission) => mission.id)).size).toBe(16);
    for (const mission of CAMPAIGN_MISSIONS) {
      expect(mission.terrainProfile, mission.id).toBeTruthy();
      expect(mission.hasCarrierRecovery, mission.id).toBe(true);
      expect(mission.carrierLandingX, mission.id).toBeGreaterThanOrEqual(0);
      expect(mission.carrierLandingX, mission.id).toBeLessThanOrEqual(mission.mapLength);
    }
  });

  it('migrates every released campaign save generation without losing progress', () => {
    for (const version of [1, 2, 3, 4]) {
      const migrated = sanitiseCampaignSave({
        ...createDefaultCampaignSave(),
        version,
        completedMissionIds: ['m1_coastal_strike'],
        bestScores: { m1_coastal_strike: 1987 },
        difficulty: 'VETERAN',
      });
      expect(migrated).toMatchObject({ version: 4, difficulty: 'VETERAN', bestScores: { m1_coastal_strike: 1987 } });
      expect(migrated.completedMissionIds).toContain('m1_coastal_strike');
    }
  });

  it('preserves deterministic three-sortie definitions for operation V1 and V2', () => {
    for (const version of [1, 2] as const) {
      const first = version === 1 ? generateOperation(1987, 'PILOT') : generateOperation(1987, 'PILOT', 2);
      const replay = version === 1 ? generateOperation(1987, 'PILOT') : generateOperation(1987, 'PILOT', 2);
      expect(first).toEqual(replay);
      expect(first.sorties).toHaveLength(3);
      first.sorties.forEach((_, index) => expect(generateOperationMission(first, index).objectives.length).toBeGreaterThan(0));
    }
  });

  it('exports a bounded technical report without raw inputs, identity or operation seeds', () => {
    const performance: PerformanceSnapshot = {
      preference: 'AUTO', activeQuality: 'HIGH', averageFrameMs: 16.4, p95FrameMs: 18,
      effectiveFps: 60, longFramePercent: 0, sampleCount: 120, deviceClass: 'DESKTOP', resolutionScale: 1, particleBudget: 1,
    };
    const report = buildIssueReport(
      createDefaultCampaignSave(),
      Array.from({ length: 25 }, (_, index) => diagnostic(`m${index}`)),
      performance,
      null,
      { viewportWidth: 1920, viewportHeight: 1080, devicePixelRatio: 1, online: false, standalone: true, inputDevice: 'GAMEPAD' },
      '2026-08-30T12:00:00.000Z',
    );
    const json = exportIssueReportJson(report);
    expect(report.recentDiagnostics).toHaveLength(20);
    expect(report.recentDiagnostics[0].missionId).toBe('m5');
    expect(json).not.toMatch(/operationSeed|inputBindings|userAgent|localStorage|email|playerName|rawKey/i);
    expect(json).toContain(RELEASE_INFO.buildId);
  });
});
