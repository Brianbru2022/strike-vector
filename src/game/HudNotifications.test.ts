import { describe, expect, it } from 'vitest';
import { HUD_NOTIFICATION_PRIORITY, selectHudNotification } from './HudNotifications';

describe('HUD notification priority', () => {
  it('shows only the highest-priority candidate', () => {
    expect(selectHudNotification([
      { id: 'objective', priority: 10, tone: 'OBJECTIVE', label: 'OBJECTIVE', message: 'Recover' },
      { id: 'missile', priority: 90, tone: 'DANGER', label: 'MISSILE', message: 'Break and flare' },
      { id: 'radio', priority: 40, tone: 'INFO', label: 'RADIO', message: 'Contact' },
    ])?.id).toBe('missile');
  });

  it('uses stable IDs to break equal-priority ties', () => {
    expect(selectHudNotification([
      { id: 'bravo', priority: 50, tone: 'INFO', label: 'B', message: 'B' },
      { id: 'alpha', priority: 50, tone: 'INFO', label: 'A', message: 'A' },
    ])?.id).toBe('alpha');
  });

  it('lets immediate combat danger interrupt training and radio', () => {
    expect(selectHudNotification([
      { id: 'training', priority: HUD_NOTIFICATION_PRIORITY.TRAINING, tone: 'TRAINING', label: 'TRAINING', message: 'Select a target' },
      { id: 'radio', priority: HUD_NOTIFICATION_PRIORITY.RADIO, tone: 'INFO', label: 'RADIO', message: 'Bandits inbound' },
      { id: 'missile', priority: HUD_NOTIFICATION_PRIORITY.MISSILE, tone: 'DANGER', label: 'MISSILE', message: 'Break and flare' },
    ])?.id).toBe('missile');
  });

  it('drops blank and duplicate candidates before selecting', () => {
    expect(selectHudNotification([
      { id: 'radio', priority: 20, tone: 'INFO', label: 'RADIO', message: '  ' },
      { id: 'score', priority: 10, tone: 'INFO', label: 'RESULT', message: 'Hit' },
      { id: 'score', priority: 30, tone: 'INFO', label: 'RESULT', message: 'Target destroyed' },
    ])?.message).toBe('Target destroyed');
  });
});
