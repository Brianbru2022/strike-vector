import { describe, expect, it } from 'vitest';
import { rankDesktopSaveCandidates } from './PlatformRuntime';

const candidate = (source: string, exportedAt?: string) => ({
  source,
  json: JSON.stringify({ format: 'IRON_KESTREL_SAVE_ARCHIVE', version: 1, exportedAt }),
});

describe('desktop save conflict ordering', () => {
  it('prefers a newer backup over an older cloud-restored primary', () => {
    const ordered = rankDesktopSaveCandidates([
      candidate('save-v1.json', '2026-08-20T12:00:00.000Z'),
      candidate('save-v1.backup-1.json', '2026-08-21T12:00:00.000Z'),
    ]);
    expect(ordered.map(({ source }) => source)).toEqual(['save-v1.backup-1.json', 'save-v1.json']);
  });

  it('keeps native order when timestamps are absent or corrupt', () => {
    const ordered = rankDesktopSaveCandidates([
      candidate('save-v1.json'),
      { source: 'save-v1.backup-1.json', json: '{broken' },
    ]);
    expect(ordered.map(({ source }) => source)).toEqual(['save-v1.json', 'save-v1.backup-1.json']);
  });
});
