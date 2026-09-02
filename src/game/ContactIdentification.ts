import { DefendedAssetState, EnemyUnit, PlayerStats } from '../types/game';

export interface ContactIdentificationResult {
  unidentifiedContacts: number;
  identificationProgress: number;
  targetingTrackProgress: number;
  newlyIdentified: EnemyUnit[];
  newlyEstablishedTracks: EnemyUnit[];
}

export function updateContactIdentification(
  contacts: EnemyUnit[],
  observer: Pick<PlayerStats, 'x' | 'y'>,
  defendedAsset: DefendedAssetState | null,
): ContactIdentificationResult {
  let highestIdentification = 0;
  let highestTrack = 0;
  let unidentifiedContacts = 0;
  const newlyIdentified: EnemyUnit[] = [];
  const newlyEstablishedTracks: EnemyUnit[] = [];
  for (const contact of contacts) {
    if (!contact.isAlive || !contact.identificationRequired) continue;
    const identificationTicks = Math.max(1, contact.identificationTicksRequired ?? 120);
    const trackTicks = Math.max(1, contact.targetingTrackTicksRequired ?? 1500);
    contact.identificationProgress = Math.max(0, contact.identificationProgress ?? 0);
    contact.targetingTrackProgress = Math.max(0, contact.targetingTrackProgress ?? 0);
    if (!contact.identified) {
      unidentifiedContacts++;
      const range = Math.hypot(contact.x - observer.x, contact.y - observer.y);
      if (range <= 1180 && Math.abs(contact.y - observer.y) <= 260) {
        contact.identificationProgress = Math.min(identificationTicks, contact.identificationProgress + 1);
        if (contact.identificationProgress >= identificationTicks) {
          contact.identified = true;
          contact.isTargetable = true;
          unidentifiedContacts--;
          newlyIdentified.push(contact);
        }
      }
    }
    if (!contact.targetingTrackEstablished) {
      contact.targetingTrackProgress = Math.min(trackTicks, contact.targetingTrackProgress + 1);
      if (contact.targetingTrackProgress >= trackTicks) {
        contact.targetingTrackEstablished = true;
        if (defendedAsset) defendedAsset.integrity = Math.max(0, defendedAsset.integrity - (contact.targetingTrackDamage ?? 30));
        newlyEstablishedTracks.push(contact);
      }
    }
    highestIdentification = Math.max(highestIdentification, (contact.identificationProgress ?? 0) / identificationTicks);
    highestTrack = Math.max(highestTrack, (contact.targetingTrackProgress ?? 0) / trackTicks);
  }
  return { unidentifiedContacts, identificationProgress: Math.min(1, highestIdentification), targetingTrackProgress: Math.min(1, highestTrack), newlyIdentified, newlyEstablishedTracks };
}
