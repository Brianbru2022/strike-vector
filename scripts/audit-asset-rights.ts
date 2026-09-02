import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type ReleaseStatus = 'APPROVED' | 'CONDITIONAL' | 'UNRESOLVED' | 'BLOCKED';

interface RightsRule {
  id: string;
  pattern: string;
  category: string;
  provenance: string;
  creator: string;
  rightsBasis: string;
  releaseStatus: ReleaseStatus;
  attributionRequired: boolean;
  sourceEvidence: string[];
}

interface RightsRegister {
  schemaVersion: number;
  product: string;
  reviewedAt: string;
  scope: string;
  policy: { allowedStatuses: ReleaseStatus[]; blockedStatuses: ReleaseStatus[]; aiOutputNotice: string; termsReference: string };
  rules: RightsRule[];
}

const root = process.cwd();
const assetRoot = path.join(root, 'public', 'assets');
const registerPath = path.join(root, 'docs', 'asset-rights-register.json');
const reportPath = path.join(root, 'reports', 'commercial-release', 'asset-rights-audit.json');

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function globExpression(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const expanded = escaped.replace(/\*\*/g, '::DOUBLE_STAR::').replace(/\*/g, '[^/]*').replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${expanded}$`, 'i');
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

const register = JSON.parse(readFileSync(registerPath, 'utf8')) as RightsRegister;
const files = walk(assetRoot).sort();
const evidenceMissing = [...new Set(register.rules.flatMap((rule) => rule.sourceEvidence))]
  .filter((evidence) => !/^https?:\/\//.test(evidence) && !existsSync(path.join(root, evidence)));

const assets = files.map((absolute) => {
  const relative = path.relative(assetRoot, absolute).replace(/\\/g, '/');
  const matches = register.rules.filter((rule) => globExpression(rule.pattern).test(relative));
  const rule = matches.length === 1 ? matches[0] : undefined;
  return {
    path: `public/assets/${relative}`,
    bytes: statSync(absolute).size,
    sha256: sha256(absolute),
    ruleId: rule?.id ?? null,
    category: rule?.category ?? 'UNREGISTERED',
    provenance: rule?.provenance ?? 'UNKNOWN',
    creator: rule?.creator ?? 'UNKNOWN',
    rightsBasis: rule?.rightsBasis ?? 'No matching rights rule',
    releaseStatus: rule?.releaseStatus ?? 'UNRESOLVED',
    attributionRequired: rule?.attributionRequired ?? null,
    sourceEvidence: rule?.sourceEvidence ?? [],
    matchingRuleCount: matches.length,
  };
});

const unresolved = assets.filter((asset) => asset.matchingRuleCount !== 1 || register.policy.blockedStatuses.includes(asset.releaseStatus as ReleaseStatus));
const totals = {
  assets: assets.length,
  bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  approved: assets.filter((asset) => asset.releaseStatus === 'APPROVED').length,
  conditional: assets.filter((asset) => asset.releaseStatus === 'CONDITIONAL').length,
  unresolved: unresolved.length,
};
const passed = register.schemaVersion === 1 && evidenceMissing.length === 0 && unresolved.length === 0;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  product: register.product,
  registerReviewedAt: register.reviewedAt,
  passed,
  totals,
  evidenceMissing,
  policy: register.policy,
  assets,
};

mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Asset rights audit: ${passed ? 'PASS' : 'FAIL'}`);
console.log(`Assets: ${totals.assets}; approved: ${totals.approved}; conditional: ${totals.conditional}; unresolved: ${totals.unresolved}`);
console.log(`Registered size: ${(totals.bytes / 1024 / 1024).toFixed(2)} MiB`);
if (evidenceMissing.length) console.error(`Missing evidence: ${evidenceMissing.join(', ')}`);
if (unresolved.length) unresolved.forEach((asset) => console.error(`${asset.path}: ${asset.rightsBasis} (${asset.matchingRuleCount} matching rules)`));
if (!passed) process.exitCode = 1;
