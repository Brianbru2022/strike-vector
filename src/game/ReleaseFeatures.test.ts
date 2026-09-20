import { describe, expect, it } from 'vitest';
import { deriveReleaseFeatureAccess, isLocalDeveloperHost, normaliseBetaFeedbackUrl } from './ReleaseFeatures';

describe('release feature access', () => {
  it('keeps every internal surface out of a consumer build', () => {
    expect(deriveReleaseFeatureAccess({ development: false, internalToolsBuild: false, hostname: '127.0.0.1', search: '?playtest=1&authoring=1' })).toEqual({
      internalToolsCompiled: false,
      localDeveloperHost: true,
      diagnostics: false,
      validation: false,
      authoring: false,
    });
  });

  it('allows explicitly requested tools only in a local internal build', () => {
    expect(deriveReleaseFeatureAccess({ development: false, internalToolsBuild: true, hostname: 'localhost', search: '?playtest=1&authoring=1' })).toMatchObject({ diagnostics: true, validation: true, authoring: true });
    expect(deriveReleaseFeatureAccess({ development: false, internalToolsBuild: true, hostname: 'play.example.test', search: '?playtest=1&authoring=1' })).toMatchObject({ diagnostics: false, validation: false, authoring: false });
  });

  it('retains development workflows without query flags', () => {
    expect(deriveReleaseFeatureAccess({ development: true, internalToolsBuild: false, hostname: '192.168.0.20', search: '' })).toMatchObject({ diagnostics: true, validation: true, authoring: true });
    expect(isLocalDeveloperHost('::1')).toBe(true);
  });

  it('never exposes internal tools in the browser demo, including on localhost', () => {
    expect(deriveReleaseFeatureAccess({ development: true, internalToolsBuild: true, demoBuild: true, hostname: '127.0.0.1', search: '?playtest=1&authoring=1' })).toEqual({
      internalToolsCompiled: false, localDeveloperHost: true, diagnostics: false, validation: false, authoring: false,
    });
  });

  it('accepts only explicit web feedback destinations', () => {
    expect(normaliseBetaFeedbackUrl('https://example.test/iron-kestrel-feedback')).toBe('https://example.test/iron-kestrel-feedback');
    expect(normaliseBetaFeedbackUrl('javascript:alert(1)')).toBeNull();
    expect(normaliseBetaFeedbackUrl('')).toBeNull();
  });
});
