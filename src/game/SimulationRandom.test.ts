import { describe, expect, it } from 'vitest';
import { FixedStepClock } from './FixedStepClock';
import { PlayerAircraft } from './PlayerAircraft';
import { SimulationRandom } from './SeededRandom';

describe('authoritative simulation randomness', () => {
  it('repeats authoritative sequences and isolates presentation draws', () => {
    const first = new SimulationRandom(1987);
    const second = new SimulationRandom(1987);
    first.presentation.nextFloat();
    first.presentation.nextFloat();
    expect(Array.from({ length: 8 }, () => first.authoritative.nextInt(1000)))
      .toEqual(Array.from({ length: 8 }, () => second.authoritative.nextInt(1000)));
  });

  it('selects the same damaged subsystem after a mission reset', () => {
    const firstRandom = new SimulationRandom(77);
    const secondRandom = new SimulationRandom(77);
    const first = new PlayerAircraft(firstRandom.authoritative);
    const second = new PlayerAircraft(secondRandom.authoritative);
    first.applyDamage(10);
    second.applyDamage(10);
    expect(first.stats.subsystems).toEqual(second.stats.subsystems);
  });

  it.each([30, 60, 120])('draws the same authoritative outcomes at %i Hz rendering', (renderHz) => {
    const random = new SimulationRandom(401987);
    const clock = new FixedStepClock(1 / 60);
    const draws: number[] = [];
    for (let frame = 0; frame < renderHz * 3; frame++) clock.advance(1 / renderHz, () => draws.push(random.authoritative.nextInt(10000)));
    const reference = new SimulationRandom(401987);
    expect(draws).toEqual(Array.from({ length: 180 }, () => reference.authoritative.nextInt(10000)));
  });
});
