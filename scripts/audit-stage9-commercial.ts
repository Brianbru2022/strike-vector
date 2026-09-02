import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

interface Approval {
  buildId: string;
  publisherLegalName: string | null;
  publicSupportEmail: string | null;
  trademarkClearance: { status: string; opinionReference: string | null; approvedAt: string | null };
  legalDocuments: { status: string; approvedAt: string | null };
  storeMedia: { status: string; approvedAt: string | null };
  systemRequirements: { status: string; approvedAt: string | null };
  steam: { contentSurvey: string; storePresence: string; productBuild: string; comingSoonPublishedAt: string | null };
}

const strict = process.argv.includes('--strict');
const root = process.cwd();
const blockers: string[] = [];
const externalApprovals: string[] = [];
const warnings: string[] = [];
const required = [
  'docs/EULA.md', 'docs/PRIVACY.md', 'docs/SUPPORT.md', 'docs/AI_GENERATION_DISCLOSURE.md',
  'docs/STEAM_CONTENT_SURVEY_DRAFT.md', 'docs/STORE_PAGE.md', 'docs/TITLE_CLEARANCE_BRIEF.md',
  'docs/THIRD_PARTY_LICENCE_REVIEW.md', 'docs/ASSET_RIGHTS_REGISTER.md',
  'public/legal/EULA.txt', 'public/legal/PRIVACY.txt', 'public/legal/SUPPORT.txt',
  'public/legal/AI_CONTENT_DISCLOSURE.txt', 'public/legal/THIRD_PARTY_NOTICES.txt',
  'public/legal/RUST_THIRD_PARTY_NOTICES.txt',
  'config/storefront-claims.json', 'config/commercial-approval.json',
  'art/source/generated-1987/stage9-store-v1/iron-kestrel-store-master-source.png',
  'art/source/generated-1987/stage9-store-v1/provenance.json',
  'marketing/store/stage9/capsule-manifest.json', 'marketing/store/stage9/gameplay-media-manifest.json',
];
for (const file of required) {
  if (!existsSync(path.join(root, file))) blockers.push(`Missing Stage 9 deliverable: ${file}`);
}

const dimensions: Record<string, [number, number]> = {
  'header_capsule.jpg': [920, 430], 'small_capsule.png': [462, 174], 'main_capsule.jpg': [1232, 706],
  'vertical_capsule.jpg': [748, 896], 'page_background.jpg': [1438, 810], 'library_capsule.jpg': [600, 900],
  'library_hero.jpg': [3840, 1240], 'library_logo.png': [1280, 320], 'library_header_capsule.jpg': [920, 430],
};
const capsulePath = path.join(root, 'marketing/store/stage9/capsule-manifest.json');
if (existsSync(capsulePath)) {
  const manifest = JSON.parse(readFileSync(capsulePath, 'utf8')) as { buildId?: string; source?: string; sourceSha256?: string; provenance?: string; provenanceSha256?: string; assets?: Array<{ file: string; width: number; height: number; sha256: string }> };
  if (manifest.buildId !== RELEASE_INFO.buildId) blockers.push(`Store capsules belong to ${manifest.buildId ?? 'an unknown build'}, not ${RELEASE_INFO.buildId}.`);
  for (const [label, file, checksum] of [['source', manifest.source, manifest.sourceSha256], ['provenance', manifest.provenance, manifest.provenanceSha256]] as const) {
    if (!file || !checksum || !existsSync(path.join(root, file))) blockers.push(`Store capsule ${label} evidence is missing.`);
    else if (createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex') !== checksum) blockers.push(`Store capsule ${label} evidence has changed.`);
  }
  for (const [file, expected] of Object.entries(dimensions)) {
    const entry = manifest.assets?.find((asset) => asset.file === file);
    const absolute = path.join(root, 'marketing/store/stage9', file);
    if (!entry || !existsSync(absolute)) blockers.push(`Missing current Steam asset: ${file}`);
    else if (entry.width !== expected[0] || entry.height !== expected[1]) blockers.push(`${file} has obsolete dimensions.`);
    else if (createHash('sha256').update(readFileSync(absolute)).digest('hex') !== entry.sha256) blockers.push(`${file} differs from its manifest checksum.`);
  }
}

const mediaPath = path.join(root, 'marketing/store/stage9/gameplay-media-manifest.json');
if (existsSync(mediaPath)) {
  const manifest = JSON.parse(readFileSync(mediaPath, 'utf8')) as { releaseVersion?: string; buildId?: string; servedTitle?: string; policy?: string; captures?: Array<{ file: string; width: number; height: number; sha256: string }>; trailer?: { file: string; width?: number; height?: number; bytes?: number; sha256: string; source?: string } | null };
  if (manifest.buildId !== RELEASE_INFO.buildId || manifest.releaseVersion !== RELEASE_INFO.version) blockers.push(`Gameplay media does not belong to ${RELEASE_INFO.buildId}.`);
  if (!manifest.servedTitle?.includes("Iron Kestrel '87")) blockers.push('Gameplay media was captured from the wrong application.');
  if (!/game-stage output only/i.test(manifest.policy ?? '')) blockers.push('Gameplay-only capture policy is missing.');
  if ((manifest.captures?.length ?? 0) < 5) blockers.push('At least five gameplay-only store screenshots are required.');
  for (const capture of manifest.captures ?? []) {
    const absolute = path.join(root, 'marketing/store/stage9', capture.file);
    if (capture.width < 1920 || capture.height < 1080 || capture.width / capture.height !== 16 / 9) blockers.push(`${capture.file} is not a minimum 1920x1080 16:9 capture.`);
    else if (!existsSync(absolute) || createHash('sha256').update(readFileSync(absolute)).digest('hex') !== capture.sha256) blockers.push(`${capture.file} is missing or stale.`);
  }
  if (!manifest.trailer || !existsSync(path.join(root, 'marketing/store/stage9', manifest.trailer.file))) blockers.push('Gameplay trailer master is missing.');
  else {
    const trailerPath = path.join(root, 'marketing/store/stage9', manifest.trailer.file);
    const trailerBytes = readFileSync(trailerPath);
    if (manifest.trailer.width !== 1920 || manifest.trailer.height !== 1080) blockers.push('Gameplay trailer master is not 1920x1080.');
    if (manifest.trailer.bytes !== trailerBytes.length || manifest.trailer.sha256 !== createHash('sha256').update(trailerBytes).digest('hex')) blockers.push('Gameplay trailer master is stale or differs from its manifest.');
    if (!/game-stage output only/i.test(manifest.trailer.source ?? '')) blockers.push('Gameplay trailer source declaration is missing.');
  }
}

const storePagePath = path.join(root, 'docs/STORE_PAGE.md');
if (existsSync(storePagePath)) {
  const storePage = readFileSync(storePagePath, 'utf8');
  for (const unsupported of ['Steam Cloud', 'Full controller support', 'Steam Deck compatibility', 'Achievements']) {
    if (new RegExp(`(?:supports?|includes?|features?)\\s+[^.\\n]*${unsupported}`, 'i').test(storePage)) blockers.push(`Store copy prematurely claims ${unsupported}.`);
  }
  if (!/Pre-generated AI-assisted visual source material/i.test(storePage) || !/no generative AI runs during play/i.test(storePage)) blockers.push('Store copy lacks the approved pre-generated AI disclosure.');
}
const claimsPath = path.join(root, 'config/storefront-claims.json');
if (existsSync(claimsPath)) {
  const claims = JSON.parse(readFileSync(claimsPath, 'utf8')) as { buildId?: string; approvedClaims?: string[]; withheldUntilCertified?: string[] };
  if (claims.buildId !== RELEASE_INFO.buildId) blockers.push(`Storefront claims belong to ${claims.buildId ?? 'an unknown build'}, not ${RELEASE_INFO.buildId}.`);
  for (const withheld of ['Steam Cloud', 'Full controller support', 'Steam Deck compatibility', 'Achievements']) {
    if (!claims.withheldUntilCertified?.includes(withheld)) blockers.push(`Uncertified feature is not withheld: ${withheld}.`);
  }
  const missionCountTerms = [`${RELEASE_INFO.campaignMissionCount}-mission`, `${RELEASE_INFO.campaignMissionCount} mission`, ...(RELEASE_INFO.campaignMissionCount === 16 ? ['Sixteen-mission', 'sixteen mission'] : [])];
  if (!claims.approvedClaims?.some((claim) => missionCountTerms.some((term) => claim.includes(term)))) blockers.push('Approved storefront claims do not match the campaign mission count.');
}

const approvalPath = path.join(root, 'config/commercial-approval.json');
if (existsSync(approvalPath)) {
  const approval = JSON.parse(readFileSync(approvalPath, 'utf8')) as Approval;
  if (approval.buildId !== RELEASE_INFO.buildId) blockers.push(`Commercial approval record belongs to ${approval.buildId ?? 'an unknown build'}, not ${RELEASE_INFO.buildId}.`);
  if (!approval.publisherLegalName) externalApprovals.push('Publisher legal name has not been supplied.');
  if (!approval.publicSupportEmail) externalApprovals.push('Public support address has not been supplied.');
  if (approval.trademarkClearance.status !== 'APPROVED' || !approval.trademarkClearance.opinionReference) externalApprovals.push("Formal title/trade-mark clearance for Iron Kestrel '87 is pending.");
  if (approval.legalDocuments.status !== 'APPROVED') externalApprovals.push('Publisher/counsel approval of the EULA and privacy documents is pending.');
  if (approval.storeMedia.status !== 'APPROVED') externalApprovals.push('Human approval of screenshots, capsule crops and the final trailer encode is pending.');
  if (approval.systemRequirements.status !== 'APPROVED') externalApprovals.push('System requirements have not been confirmed against the signed near-final Windows build.');
  if (approval.steam.contentSurvey !== 'APPROVED') externalApprovals.push('Steam content survey has not been submitted and approved.');
  if (approval.steam.storePresence !== 'APPROVED') externalApprovals.push('Steam store presence has not been approved.');
  if (approval.steam.productBuild !== 'APPROVED') externalApprovals.push('Near-final Steam product build has not been approved.');
  if (!approval.steam.comingSoonPublishedAt) externalApprovals.push('Coming Soon publication date has not been recorded.');
}

const dependencyPath = path.join(root, 'reports/commercial-release/dependency-licences.json');
if (!existsSync(dependencyPath)) blockers.push('Dependency licence report is missing.');
else {
  const dependencies = JSON.parse(readFileSync(dependencyPath, 'utf8')) as { unresolved?: unknown[]; missingLicenceFiles?: unknown[] };
  if ((dependencies.unresolved?.length ?? 0) > 0) blockers.push(`${dependencies.unresolved!.length} dependency licences are unresolved.`);
  if ((dependencies.missingLicenceFiles?.length ?? 0) > 0) warnings.push(`${dependencies.missingLicenceFiles!.length} permissive packages lack a bundled upstream text; see THIRD_PARTY_LICENCE_REVIEW.md.`);
}
const rustDependencyPath = path.join(root, 'reports/commercial-release/rust-dependency-licences.json');
if (!existsSync(rustDependencyPath)) blockers.push('Rust/Tauri dependency licence report is missing.');
else {
  const dependencies = JSON.parse(readFileSync(rustDependencyPath, 'utf8')) as { unresolved?: unknown[]; missingLicenceFiles?: unknown[] };
  if ((dependencies.unresolved?.length ?? 0) > 0) blockers.push(`${dependencies.unresolved!.length} Rust/Tauri dependency licences are unresolved.`);
  if ((dependencies.missingLicenceFiles?.length ?? 0) > 0) warnings.push(`${dependencies.missingLicenceFiles!.length} permissive Rust/Tauri packages lack a bundled upstream text; see THIRD_PARTY_LICENCE_REVIEW.md.`);
}

const rightsPath = path.join(root, 'reports/commercial-release/asset-rights-audit.json');
if (!existsSync(rightsPath)) blockers.push('Asset-rights report is missing.');
else {
  const rights = JSON.parse(readFileSync(rightsPath, 'utf8')) as { passed?: boolean; totals?: { conditional?: number } };
  if (!rights.passed) blockers.push('Asset-rights audit is not passing.');
  if ((rights.totals?.conditional ?? 0) > 0) externalApprovals.push(`${rights.totals!.conditional} AI-assisted runtime assets still require final human/legal similarity review.`);
}

const effectiveBlockers = [...blockers, ...(strict ? externalApprovals : [])];
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildId: RELEASE_INFO.buildId,
  mode: strict ? 'RELEASE_GATE' : 'PREPARATION_AUDIT',
  status: effectiveBlockers.length ? 'BLOCKED' : 'PREPARED',
  blockers: effectiveBlockers,
  pendingExternalApprovals: externalApprovals,
  warnings,
};
const reportPath = path.join(root, 'reports/commercial-release', strict ? 'stage9-commercial-release-gate.json' : 'stage9-commercial-readiness.json');
mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Stage 9 ${strict ? 'release gate' : 'preparation audit'}: ${report.status}`);
console.log(`Local blockers: ${blockers.length}; external approvals: ${externalApprovals.length}; warnings: ${warnings.length}`);
effectiveBlockers.forEach((item) => console.error(`BLOCKER: ${item}`));
externalApprovals.filter((item) => !strict).forEach((item) => console.warn(`PENDING: ${item}`));
if (effectiveBlockers.length) process.exitCode = 1;
