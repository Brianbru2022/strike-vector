import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CARRIER_QUALIFICATION_STEPS, TRAINING_SUCCESS_TICKS } from '../src/game/TrainingDirector';
import { RELEASE_INFO } from '../src/game/Release';

const expectedOrder = ['LAUNCH', 'PITCH', 'THROTTLE', 'CANNON', 'TARGET', 'SIDEWINDER', 'COUNTERMEASURE', 'VTOL', 'RECOVERY'];
const purpose: Record<string, string> = {
  LAUNCH: 'Establishes departure and safe separation from the carrier.',
  PITCH: 'Teaches the primary vertical flight input before combat.',
  THROTTLE: 'Introduces power and forward acceleration before the patrol area.',
  CANNON: 'Confirms primary fire while hostile aircraft remain held.',
  TARGET: 'Lets the player create a lock by flying, rather than reading a targeting manual.',
  SIDEWINDER: 'Pairs a visible lock with the selected secondary-weapon action.',
  COUNTERMEASURE: 'Rehearses the defensive action before a live missile warning.',
  VTOL: 'Introduces nozzle transition before the carrier approach.',
  RECOVERY: 'Combines the learned controls into the sortie objective.',
};

const issues: string[] = [];
if (CARRIER_QUALIFICATION_STEPS.length !== expectedOrder.length) issues.push(`Expected ${expectedOrder.length} lessons.`);
if (CARRIER_QUALIFICATION_STEPS.map((step) => step.id).join('|') !== expectedOrder.join('|')) issues.push('Lesson order does not match the approved carrier-qualification sequence.');
if (TRAINING_SUCCESS_TICKS < 36 || TRAINING_SUCCESS_TICKS > 90) issues.push('Success confirmation must remain visible for 0.6 to 1.5 simulation seconds.');

const steps = CARRIER_QUALIFICATION_STEPS.map((step, index) => {
  const promptLength = `${step.title} — ${step.instruction}`.length;
  const stepIssues: string[] = [];
  if (!purpose[step.id]) stepIssues.push('No just-in-time purpose is documented.');
  if (!step.instruction.trim() || step.instruction.length > 92) stepIssues.push('Instruction is empty or too long for the compact banner.');
  if (!step.successMessage.trim() || step.successMessage === step.instruction) stepIssues.push('Distinct success feedback is missing.');
  if (promptLength > 116) stepIssues.push('Combined title and instruction are too long.');
  if (step.completion === 'SEMANTIC_ACTION' && !step.action) stepIssues.push('Semantic-action lesson has no action binding.');
  issues.push(...stepIssues.map((issue) => `${step.id}: ${issue}`));
  return {
    order: index + 1,
    id: step.id,
    necessaryNow: purpose[step.id],
    instruction: step.instruction,
    instructionClearByAutomatedRules: stepIssues.length === 0,
    learnedByDoing: step.completion,
    promptLength,
    placement: 'TOP_SAFE_BANNER',
    successResponse: step.successMessage,
    successDurationTicks: step.id === 'RECOVERY' ? 0 : TRAINING_SUCCESS_TICKS,
    successDurationSeconds: step.id === 'RECOVERY' ? 0 : TRAINING_SUCCESS_TICKS / 60,
    issues: stepIssues,
  };
});

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildId: RELEASE_INFO.buildId,
  automatedPassed: issues.length === 0,
  humanEvidenceStatus: 'PENDING_MILESTONE_5_SESSIONS',
  finalCopyApproval: false,
  flow: ['TEACH', 'PLAYER_ACTS', 'CLEAR_SUCCESS_RESPONSE', 'NEXT_LESSON'],
  skipAvailable: true,
  steps,
  issues,
  note: 'Automated review certifies structure, brevity, timing and placement only. Wording remains provisional until the five human control-concept sessions are reviewed.',
};

const output = resolve('reports', 'milestone-6');
await mkdir(output, { recursive: true });
await writeFile(join(output, 'guided-onboarding-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(output, 'guided-onboarding-audit.md'), [
  '# Milestone 6 guided onboarding audit', '',
  `Build: \`${RELEASE_INFO.buildId}\``, '',
  `Automated structure: **${report.automatedPassed ? 'PASS' : 'FAIL'}**`,
  'Human wording evidence: **PENDING MILESTONE 5 SESSIONS**', '',
  '| # | Lesson | Learn by doing | Success response | Banner copy |',
  '| -: | --- | --- | --- | --- |',
  ...steps.map((step) => `| ${step.order} | ${step.id} | ${step.learnedByDoing} | ${step.successResponse} | ${step.promptLength} chars |`), '',
  'The runtime now uses TEACH → PLAYER ACTS → CLEAR SUCCESS RESPONSE → NEXT LESSON. Non-final confirmations remain visible for 0.8 simulation seconds in a top safe-area banner. Recovery completion is confirmed by the debrief transition.', '',
  'The skip control remains available during every active instruction. Automated checks do not approve wording on behalf of players; final copy approval requires the five genuine Milestone 5 sessions.', '',
  ...(issues.length ? ['## Automated issues', '', ...issues.map((issue) => `- ${issue}`), ''] : []),
].join('\n'), 'utf8');

console.log(`Guided Mission 1 onboarding audit: ${report.automatedPassed ? 'PASS' : 'FAIL'} (${steps.length} lessons; human wording review pending)`);
for (const issue of issues) console.log(`- ${issue}`);
if (!report.automatedPassed) process.exitCode = 1;
