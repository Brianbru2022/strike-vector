import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { aggregateControlConceptEvidence, CONTROL_CONCEPT_SLOTS, sanitiseControlConceptEvidence } from '../src/game/ControlConceptPlaytest';
import { RELEASE_INFO } from '../src/game/Release';

const input = resolve(process.argv.find((argument) => argument.endsWith('.json')) ?? join('reports', 'milestone-5', 'control-concept-evidence.json'));
const inputDisplay = relative(process.cwd(), input);
const reportDirectory = resolve('reports', 'milestone-5');
const issues: string[] = [];
let raw: unknown = null;

try { raw = JSON.parse(await readFile(input, 'utf8')); }
catch { issues.push(`Evidence file is missing or invalid JSON: ${inputDisplay}`); }

const source = raw && typeof raw === 'object' ? raw as { version?: unknown; buildId?: unknown; evidence?: unknown } : {};
if (source.version !== 1) issues.push('Evidence export version must be 1.');
if (source.buildId !== RELEASE_INFO.buildId) issues.push(`Evidence must target current build ${RELEASE_INFO.buildId}.`);
const evidence = Array.isArray(source.evidence)
  ? source.evidence.map(sanitiseControlConceptEvidence).filter((item): item is NonNullable<ReturnType<typeof sanitiseControlConceptEvidence>> => item !== null)
  : [];
if (!Array.isArray(source.evidence)) issues.push('Evidence export does not contain an evidence array.');
else if (evidence.length !== source.evidence.length) issues.push('Evidence export contains malformed records.');

const summary = aggregateControlConceptEvidence(evidence);
issues.push(...summary.issues);
const currentSlots = new Set(evidence.filter((item) => item.buildId === RELEASE_INFO.buildId).map((item) => item.slotId));
for (const slot of CONTROL_CONCEPT_SLOTS) if (!currentSlots.has(slot.id)) issues.push(`Missing human session ${slot.id} (${slot.experience}).`);

const passed = issues.length === 0 && summary.complete;
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, input: inputDisplay, passed, summary, issues: [...new Set(issues)] };
await mkdir(reportDirectory, { recursive: true });
await writeFile(join(reportDirectory, 'control-concept-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(reportDirectory, 'control-concept-report.md'), [
  '# Milestone 5 control-concept human test', '',
  `Build: \`${RELEASE_INFO.buildId}\``, '',
  `Status: **${passed ? 'PASS' : 'PENDING'}**`, '',
  `Coverage: ${summary.completedSlotIds.length}/5 (${summary.noviceCount}/3 novice, ${summary.experiencedCount}/2 experienced)`,
  `Wanted another sortie: ${summary.wantsAnotherSortieCount}/5`,
  `Requested another sortie without prompting: ${summary.unpromptedAnotherSortieCount}/5`, '',
  ...(report.issues.length ? ['## Outstanding evidence', '', ...report.issues.map((issue) => `- ${issue}`)] : ['No outstanding evidence issues.']), '',
].join('\n'), 'utf8');

console.log(`Milestone 5 human evidence: ${passed ? 'PASS' : 'PENDING'} (${summary.completedSlotIds.length}/5)`);
for (const issue of report.issues) console.log(`- ${issue}`);
if (!passed) process.exitCode = 1;
