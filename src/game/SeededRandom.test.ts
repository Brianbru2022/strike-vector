import { describe, expect, it } from 'vitest';
import { createSeededRandom } from './SeededRandom';

describe('seeded random generation', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = createSeededRandom(1987);
    const second = createSeededRandom(1987);
    expect([second(), second(), second()]).toEqual([first(), first(), first()]);
  });
});
