import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { generateOperation, generateOperationMission } from './DynamicOperations';
import { calculateBackdropCrop } from './TerrainSystem';
import { calculateTerrainPlacement, getEnemySpritePlacement } from './SpritePlacement';
import { calculateTerrainShadow } from './TerrainShadow';

describe('visual integration authority', () => {
  it('provides a contact-anchored sprite for every land and naval unit used by campaign or operations', () => {
    const missions = [...CAMPAIGN_MISSIONS];
    for (let seed = 0; seed < 100; seed++) {
      const operation = generateOperation(seed, 'PILOT');
      operation.sorties.forEach((_, index) => missions.push(generateOperationMission(operation, index)));
    }
    const units = missions.flatMap((mission) => [
      ...mission.spawnEnemies(),
      ...(mission.events || []).flatMap((event) => event.actions.flatMap((action) => action.type === 'SPAWN' ? action.enemies : [])),
    ]);
    const contactUnits = units.filter((unit) => (unit.category === 'GROUND' || unit.category === 'STRUCTURE' || unit.category === 'NAVAL') && unit.type !== 'ANTI_SHIP_MISSILE');
    expect(new Set(contactUnits.map((unit) => unit.type)).size).toBeGreaterThan(8);
    for (const unit of contactUnits) {
      const placement = getEnemySpritePlacement(unit.type);
      expect(placement, unit.type).not.toBeNull();
      expect(placement!.anchorX).toBeGreaterThanOrEqual(0);
      expect(placement!.anchorX).toBeLessThanOrEqual(1);
      expect(placement!.anchorY).toBeGreaterThan(0.5);
      expect(placement!.anchorY).toBeLessThanOrEqual(1);
    }
  });

  it('follows shallow terrain slopes while keeping fixed structures level', () => {
    const slope = (x: number) => 500 + x * 0.1;
    const vehicle = calculateTerrainPlacement(100, 40, slope, true);
    const structure = calculateTerrainPlacement(100, 40, slope, false);
    expect(vehicle.contactY).toBe(510);
    expect(vehicle.rotation).toBeGreaterThan(0);
    expect(vehicle.rotation).toBeLessThanOrEqual(0.105);
    expect(structure.rotation).toBe(0);
    expect(structure.contactY).toBeGreaterThan(vehicle.contactY);
  });

  it('projects contact shadows onto the authoritative terrain slope', () => {
    const slope = (x: number) => 500 + x * 0.08;
    const contact = calculateTerrainShadow(100, 40, slope);
    const airborne = calculateTerrainShadow(100, 40, slope, 300);
    expect(contact).not.toBeNull();
    expect(contact!.rotation).toBeGreaterThan(0);
    expect(contact!.contactY).toBeCloseTo(slope(100) + 1, 5);
    expect(airborne!.offsetX).toBeGreaterThan(0);
    expect(airborne!.halfWidth).toBeLessThan(contact!.halfWidth);
    expect(airborne!.alpha).toBeLessThan(contact!.alpha);
  });

  it('does not invent a land shadow where the authored terrain has no contact', () => {
    expect(calculateTerrainShadow(300, 40, () => null)).toBeNull();
  });

  it('keeps every authored backdrop crop inside source pixels at all release viewports', () => {
    const paintings = [[1672, 941], [1536, 1024], [1983, 793], [1920, 819]];
    const viewports = [[1280, 720], [2200, 700], [844, 390]];
    for (const [imageWidth, imageHeight] of paintings) {
      for (const [canvasWidth, canvasHeight] of viewports) {
        for (const cameraX of [0, 2500, 9000, 15000]) {
          const crop = calculateBackdropCrop(imageWidth, imageHeight, canvasWidth, canvasHeight, cameraX);
          expect(crop.sourceX).toBeGreaterThanOrEqual(0);
          expect(crop.sourceY).toBeGreaterThanOrEqual(0);
          expect(crop.sourceX + crop.sourceWidth).toBeLessThanOrEqual(imageWidth);
          expect(crop.sourceY + crop.sourceHeight).toBeLessThanOrEqual(imageHeight);
        }
      }
    }
  });
});
