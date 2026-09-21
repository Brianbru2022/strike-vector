import { describe, expect, it } from 'vitest';
import { FOREGROUND_PRESENTATION_PROFILES, getAtmosphericDepthBand, getForegroundPresentationProfile, getForegroundTreatment } from './ForegroundPresentation';

describe('foreground presentation authority', () => {
  it('covers every release-critical aircraft, ground, naval and recovery family', () => {
    for (const key of ['player_jet', 'enemy_jet', 'enemy_mig21', 'enemy_mig29', 'enemy_heli', 'enemy_sam', 'enemy_flak', 'enemy_tank', 'enemy_patrol_boat', 'enemy_corvette', 'carrier_ship', 'forward_base', 'act_three_objectives']) {
      expect(FOREGROUND_PRESENTATION_PROFILES[key], key).toBeDefined();
    }
  });

  it('uses environmental tint while preserving the higher-priority target rim', () => {
    const treatment = getForegroundTreatment({ spriteKey: 'enemy_sam', ambientLight: 0.35, damageStage: 1, separationFilter: 'drop-shadow(0 0 5px cyan)' });
    expect(treatment.filter).toContain('brightness(');
    expect(treatment.filter).toContain('saturate(');
    expect(treatment.filter).toContain('drop-shadow(0 0 5px cyan)');
  });

  it('keeps reduced-effects contacts readable with a restrained physical shadow', () => {
    const treatment = getForegroundTreatment({ spriteKey: 'enemy_heli', ambientLight: 0.4, reducedEffects: true });
    expect(treatment.filter).toContain('drop-shadow(0 1px 1px');
    expect(treatment.shadowFootprint).toBe(0.82);
  });

  it('returns conservative defaults for optional future sprites', () => {
    expect(getForegroundPresentationProfile('future_asset')).toMatchObject({ silhouetteScale: 1, contactAnchorY: 1 });
  });

  it('classifies contact distance into stable atmospheric bands', () => {
    expect(getAtmosphericDepthBand(120)).toBe('FOREGROUND');
    expect(getAtmosphericDepthBand(400)).toBe('ENGAGEMENT');
    expect(getAtmosphericDepthBand(780)).toBe('DISTANT');
  });

  it('softens distant ordinary contacts without concealing critical threats', () => {
    const ordinary = getForegroundTreatment({ spriteKey: 'enemy_sam', ambientLight: 0.7, distanceFromPlayer: 800 });
    const threat = getForegroundTreatment({ spriteKey: 'enemy_sam', ambientLight: 0.7, distanceFromPlayer: 800, isThreat: true, isObjective: true, separationFilter: 'drop-shadow(0 0 5px cyan)' });
    expect(ordinary.depthBand).toBe('DISTANT');
    expect(ordinary.filter).toContain('blur(0.18px)');
    expect(ordinary.opacity).toBeLessThan(threat.opacity);
    expect(threat.filter).not.toContain('blur(');
    expect(threat.filter).toContain('cyan');
    expect(threat.opacity).toBeGreaterThanOrEqual(0.95);
  });
});
