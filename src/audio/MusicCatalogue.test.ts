import { describe, expect, it } from 'vitest';
import { MUSIC_CUE_DEFINITIONS, selectGameplayMusic } from './MusicCatalogue';

describe('production music catalogue', () => {
  it('registers every supplied soundtrack role with unique bundled paths', () => {
    const cues = Object.values(MUSIC_CUE_DEFINITIONS);
    expect(cues).toHaveLength(11);
    expect(new Set(cues.map((cue) => cue.path)).size).toBe(cues.length);
    for (const cue of cues) {
      expect(cue.path).toMatch(/^\/assets\/audio\/music\/.+\.ogg$/);
      expect(cue.gain).toBeGreaterThan(0);
      expect(cue.gain).toBeLessThanOrEqual(1);
    }
  });

  it('selects signature, combat, patrol and recovery cues deterministically', () => {
    expect(selectGameplayMusic('m6_fleet_defence', 1)).toBe('storm_fleet_defence');
    expect(selectGameplayMusic('m10_hq_assault', 2.5)).toBe('bastion_assault');
    expect(selectGameplayMusic('m3_convoy_hunter', 2)).toBe('ground_strike');
    expect(selectGameplayMusic('m1_coastal_strike', 2)).toBe('air_combat_intercept');
    expect(selectGameplayMusic('m1_coastal_strike', 1)).toBe('north_atlantic_patrol');
    expect(selectGameplayMusic('m10_hq_assault', 3, true)).toBe('recovery_approach');
  });
});
