import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';

describe('authored campaign content', () => {
  it('gives every mission an explicit terrain profile', () => {
    expect(CAMPAIGN_MISSIONS).toHaveLength(16);
    expect(CAMPAIGN_MISSIONS.every((mission) => Boolean(mission.terrainProfile))).toBe(true);
    expect(new Set(CAMPAIGN_MISSIONS.map((mission) => mission.terrainProfile)).size).toBeGreaterThanOrEqual(8);
  });

  it('uses period-correct model-specific aircraft variants', () => {
    const variants = new Set(
      CAMPAIGN_MISSIONS.flatMap((mission) => mission.spawnEnemies())
        .map((enemy) => enemy.aircraftVariant)
        .filter(Boolean)
    );

    expect(variants).toEqual(new Set(['MIG_21BIS', 'MIG_23ML', 'MIG_29A', 'MI_24D', 'TU_16K']));
  });

  it('keeps every primary target count achievable and hostile aircraft clear of launch sites', () => {
    for (const mission of CAMPAIGN_MISSIONS) {
      const enemies = [
        ...mission.spawnEnemies(),
        ...(mission.events || []).flatMap((event) => event.actions.flatMap((action) => action.type === 'SPAWN' ? action.enemies : [])),
      ];
      for (const objective of mission.objectives.filter((item) => item.isPrimary && !['LANDING', 'DEFEND_ASSET'].includes(item.targetType))) {
        expect(enemies.filter((enemy) => enemy.type === objective.targetType).length).toBeGreaterThanOrEqual(objective.requiredCount);
      }
      const launchX = mission.carrierX + 120;
      expect(enemies.filter((enemy) => enemy.category === 'AIR').every((enemy) => Math.abs(enemy.x - launchX) >= 800)).toBe(true);
    }
  });

  it('builds late campaign missions with distinct force layouts', () => {
    const signatures = CAMPAIGN_MISSIONS.slice(6, 10).map((mission) =>
      mission.spawnEnemies().map((enemy) => `${enemy.type}:${enemy.x}:${enemy.aircraftVariant ?? ''}`).join('|')
    );

    expect(new Set(signatures).size).toBe(4);
  });

  it('authors Act III with unique environments and event scripts', () => {
    const actThree = CAMPAIGN_MISSIONS.slice(6, 10);
    expect(actThree.map((mission) => mission.terrainContact?.backdropKey)).toEqual([
      'JANUS_CAUSEWAY', 'JANUS_AIRBASE', 'SKELD_DEFENCE', 'BASTION_FORTRESS',
    ]);
    expect(actThree.every((mission) => (mission.events?.length || 0) > 0)).toBe(true);
    expect(actThree.every((mission) => (mission.phases?.length || 0) >= 3)).toBe(true);
  });

  it('builds the final assault with protected sequential targets', () => {
    const finale = CAMPAIGN_MISSIONS[9];
    const initial = finale.spawnEnemies();
    expect(finale.phases?.map((phase) => phase.id)).toEqual(['SAM_BELT', 'COMMAND_RADAR', 'HEADQUARTERS', 'INTERCEPTOR', 'WITHDRAW']);
    expect(initial.find((enemy) => enemy.type === 'COMMAND_BUNKER')?.isTargetable).toBe(false);
    expect(finale.objectives.find((objective) => objective.id === 'm10_hq')?.active).toBe(false);
    expect(finale.events?.find((event) => event.id === 'm10_launch_interceptor')).toBeDefined();
  });

  it('opens with a complete carrier, fjord and forward-base vertical slice', () => {
    const opening = CAMPAIGN_MISSIONS.slice(0, 3);

    expect(opening.map((mission) => mission.title)).toEqual([
      'Carrier Qualification',
      'Fjord SAM Suppression',
      'Forward-Base Capture',
    ]);
    expect(opening.map((mission) => mission.terrainProfile)).toEqual([
      'COASTAL_STRIKE',
      'FJORD_PASS',
      'FORWARD_BASE',
    ]);
    expect(opening.map((mission) => mission.recoverySite)).toEqual([
      'CARRIER',
      'CARRIER',
      'FORWARD_BASE',
    ]);
    expect(opening.every((mission) => mission.objectives.some((objective) => objective.targetType === 'LANDING'))).toBe(true);
  });

  it('builds the Forward War around convoy, rescue and fleet-defence mechanics', () => {
    const forwardWar = CAMPAIGN_MISSIONS.slice(3, 6);

    expect(forwardWar.map((mission) => mission.title)).toEqual([
      'Armoured Convoy Interdiction',
      'Downed Pilot Rescue',
      'Carrier Group Defence',
    ]);
    expect(forwardWar.map((mission) => mission.terrainProfile)).toEqual([
      'COAST_ROAD',
      'BEACHHEAD',
      'OPEN_SEA',
    ]);
    expect(forwardWar.slice(0, 2).every((mission) => mission.launchSite === 'FORWARD_BASE')).toBe(true);
    expect(forwardWar.slice(0, 2).every((mission) => mission.recoverySite === 'FORWARD_BASE')).toBe(true);
    expect(forwardWar[0].objectives.some((objective) => objective.targetType === 'COMMAND_VEHICLE')).toBe(true);
    expect(forwardWar[1].objectives.some((objective) => objective.targetType === 'DOWNED_PILOT')).toBe(true);
    expect(forwardWar[2].spawnEnemies().filter((enemy) => enemy.aircraftVariant === 'MIG_29A')).toHaveLength(3);
    expect(forwardWar[2].spawnEnemies().filter((enemy) => enemy.type === 'MISSILE_CORVETTE')).toHaveLength(2);
    expect(forwardWar[2].spawnEnemies().filter((enemy) => enemy.type === 'PATROL_BOAT')).toHaveLength(2);
    expect(forwardWar[2].spawnEnemies().filter((enemy) => enemy.type === 'MISSILE_CORVETTE').every((enemy) => enemy.salvosRemaining === 2)).toBe(true);
    expect(forwardWar[2].defendedAsset).toEqual({ type: 'CARRIER', worldX: 8800, startingIntegrity: 100, failureThreshold: 0 });
  });
});
