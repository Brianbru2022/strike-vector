export interface RandomSource {
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
  chance(probability: number): boolean;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x1987;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts: Array<string | number>): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    const text = String(part);
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= 0xff;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

class SeededRandomSource implements RandomSource {
  private readonly random: () => number;

  constructor(seed: number) {
    this.random = createSeededRandom(seed);
  }

  nextFloat(): number {
    return this.random();
  }

  nextInt(maxExclusive: number): number {
    const limit = Math.max(1, Math.floor(maxExclusive));
    return Math.floor(this.random() * limit);
  }

  chance(probability: number): boolean {
    return this.random() < Math.max(0, Math.min(1, probability));
  }
}

export class SimulationRandom {
  public authoritative: RandomSource;
  public presentation: RandomSource;

  constructor(seed: number) {
    this.authoritative = new SeededRandomSource(hashSeed(seed, 'AUTHORITATIVE'));
    this.presentation = new SeededRandomSource(hashSeed(seed, 'PRESENTATION'));
  }

  reset(seed: number): void {
    this.authoritative = new SeededRandomSource(hashSeed(seed, 'AUTHORITATIVE'));
    this.presentation = new SeededRandomSource(hashSeed(seed, 'PRESENTATION'));
  }
}
