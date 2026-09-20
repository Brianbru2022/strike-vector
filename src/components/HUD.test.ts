import { describe, expect, it } from 'vitest';
import { getHudNotificationRegion, getVerticalSpeedReadout } from './HUD';

describe('HUD vertical-speed readout', () => {
  it('shows climb as positive and descent as negative', () => {
    expect(getVerticalSpeedReadout(-1.5)).toEqual({ feetPerMinute: 900, unsafeDescent: false });
    expect(getVerticalSpeedReadout(1.5)).toEqual({ feetPerMinute: -900, unsafeDescent: false });
    expect(getVerticalSpeedReadout(0).feetPerMinute).toBe(-0);
  });

  it('uses the recovery sink-rate threshold for unsafe descent colour', () => {
    expect(getVerticalSpeedReadout(2.2).unsafeDescent).toBe(false);
    expect(getVerticalSpeedReadout(2.21).unsafeDescent).toBe(true);
  });
});

describe('HUD notification placement', () => {
  it('keeps radio captions out of the central aiming region', () => {
    expect(getHudNotificationRegion('radio')).toBe('radio-caption');
    expect(getHudNotificationRegion('missile')).toBe('central-notification');
    expect(getHudNotificationRegion('training')).toBe('training-banner');
  });
});
