import { MissionRadioCallDefinition, MissionRadioMoment } from '../types/game';

type RadioScript = Readonly<Record<MissionRadioMoment, MissionRadioCallDefinition>>;

const pack = (
  missionId: string,
  speaker: MissionRadioCallDefinition['speaker'],
  launch: string,
  contact: string,
  recovery: string,
): RadioScript => Object.freeze({
  LAUNCH: Object.freeze({ id: `${missionId}_launch`, missionId, moment: 'LAUNCH', speaker, caption: launch }),
  CONTACT: Object.freeze({ id: `${missionId}_contact`, missionId, moment: 'CONTACT', speaker, caption: contact }),
  RECOVERY: Object.freeze({ id: `${missionId}_recovery`, missionId, moment: 'RECOVERY', speaker, caption: recovery }),
});

/** Concise, caption-first 1987 radio scripts. Mission events provide additional tactical calls. */
export const MISSION_RADIO_SCRIPTS: Readonly<Record<string, RadioScript>> = Object.freeze({
  m1_coastal_strike: pack('m1_coastal_strike', 'INVINCIBLE', 'Vector, Invincible. Wind over deck is good. Cleared up the ramp.', 'Magic reports two reconnaissance aircraft crossing the coast. Weapons free after identification.', 'Vector, marshal astern. Deck is clear for qualification recovery.'),
  m2_valley_run: pack('m2_valley_run', 'STRIKE_CONTROL', 'Vector, enter the valley below the radar horizon.', 'Skeld radar is active. Expect SA-8 tracking from both slopes.', 'Air-defence corridor is open. Recover Invincible.'),
  m3_convoy_hunter: pack('m3_convoy_hunter', 'SKELD', 'Vector, Skeld control. Forward site remains contested.', 'Command vehicle and SA-8 are defending the strip.', 'Site secure. Pad lights are on for vertical recovery.'),
  m4_night_raid: pack('m4_night_raid', 'SKELD', 'Vector, depart Skeld low and dark. Convoy is moving.', 'Armour column confirmed on the coastal road. Find the command vehicle.', 'Convoy stopped. Return to Skeld before first light.'),
  m5_pilot_rescue: pack('m5_pilot_rescue', 'RESCUE_CONTROL', 'Vector, rescue control. Viper One beacon is intermittent.', 'Hind contact near the survivor. Keep the extraction zone clear.', 'Survivor aboard. Medical team is standing by at Skeld.'),
  m6_fleet_defence: pack('m6_fleet_defence', 'INVINCIBLE', 'Vector, fleet air defence. Launch into the storm.', 'Fulcrums and missile corvettes are converging on the carrier group.', 'Fleet is secure. Join the wake and recover.'),
  m7_bridge_strike: pack('m7_bridge_strike', 'STRIKE_CONTROL', 'Vector, Janus bridgehead is advancing. Stop it short of the settlement.', 'Armour is closing on the marked spans. Civilian zone remains protected.', 'Causeway cut. Recover at Skeld forward strip.'),
  m8_airbase_raid: pack('m8_airbase_raid', 'STRIKE_CONTROL', 'Vector, Janus airbase is quiet. Stay low and keep it that way.', 'GCI emissions ahead. Searchlights and alert fighters remain dormant for now.', 'Airbase blind and burning. Egress west for night recovery.'),
  m9_forward_defence: pack('m9_forward_defence', 'SKELD', 'Vector, immediate launch. Skeld is under coordinated air attack.', 'First raiders are terrain masking from the east.', 'Raid broken. Clear the ridge and recover at the functioning FARP.'),
  m10_hq_assault: pack('m10_hq_assault', 'STRIKE_CONTROL', 'Vector, Bastion assault authorised. Take the defence layers in sequence.', 'Outer SA-8 belt is painting the approach. Hardened targets remain protected.', 'Northern command is broken. Return to Invincible.'),
  m11_cold_passage: pack('m11_cold_passage', 'MAGIC', 'Vector, establish combat air patrol over the fleet passage.', 'Long-range contacts approaching the carrier group. Close for identification.', 'Passage secure. Recover aboard Invincible.'),
  m12_hammerfall_fjord: pack('m12_hammerfall_fjord', 'STRIKE_CONTROL', 'Vector, Hammerfall ingress. Use the ridgeline for cover.', 'Radar relays and coastal guns are active inside the fjord.', 'Fjord network suppressed. Follow the coast home.'),
  m13_troms_bridgehead: pack('m13_troms_bridgehead', 'STRIKE_CONTROL', 'Vector, landing force is committed at Troms. Hold the bridgehead.', 'Enemy armour and coastal artillery are ranging the beach.', 'Bridgehead secure. Recover with the landing force intact.'),
  m14_whiteout_rescue: pack('m14_whiteout_rescue', 'RESCUE_CONTROL', 'Vector, whiteout rescue. Trust instruments and beacon bearing.', 'Survivors located beyond the snow shelf. Hostile helicopter nearby.', 'Crew recovered. Follow the homing signal back to shelter.'),
  m15_red_tide: pack('m15_red_tide', 'INVINCIBLE', 'Vector, Red Tide groups are hidden in the squall. Launch now.', 'Nanuchka launchers opening. Watch for sea-skimmers below the weather.', 'Surface groups destroyed. Fleet corridor is clear.'),
  m16_north_cape_assault: pack('m16_north_cape_assault', 'STRIKE_CONTROL', 'Vector, Operation Midnight Sun is authorised. Break the cape in sequence.', 'Naval picket ahead. The outer missile belt is waiting behind it.', 'Northern front is broken. Invincible is ready to receive you.'),
});

export const getMissionRadioCall = (missionId: string, moment: MissionRadioMoment): MissionRadioCallDefinition | null =>
  MISSION_RADIO_SCRIPTS[missionId]?.[moment] ?? null;

export const formatRadioCaption = (call: MissionRadioCallDefinition): string => `${call.speaker.replace('_', ' ')}: ${call.caption}`;
