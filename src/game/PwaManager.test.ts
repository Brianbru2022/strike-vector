import { describe, expect, it } from 'vitest';
import { formatStorageSize, isIronKestrelCache } from './PwaManager';

describe('offline installation helpers', () => {
  it('limits repair matching to application and Workbox caches', () => {
    expect(isIronKestrelCache('workbox-precache-v2-http://127.0.0.1:4177/')).toBe(true);
    expect(isIronKestrelCache('iron-kestrel-runtime-v1')).toBe(true);
    expect(isIronKestrelCache('strike-vector-runtime-v1')).toBe(true);
    expect(isIronKestrelCache('unrelated-photo-editor')).toBe(false);
  });

  it('formats storage estimates without inventing unavailable values', () => {
    expect(formatStorageSize(null)).toBe('UNAVAILABLE');
    expect(formatStorageSize(1536)).toBe('2 KiB');
    expect(formatStorageSize(10.5 * 1024 * 1024)).toBe('10.5 MiB');
  });
});
