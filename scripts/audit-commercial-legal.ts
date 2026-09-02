import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface DependencyReport {
  packageCount?: number;
  licenceTextCount?: number;
  unresolved?: unknown[];
  missingLicenceFiles?: unknown[];
}

const root = process.cwd();
const reportPath = path.join(root, 'reports', 'commercial-release', 'legal-readiness.json');
const requiredFiles = [
  'public/legal/EULA.txt',
  'public/legal/PRIVACY.txt',
  'public/legal/SUPPORT.txt',
  'public/legal/AI_CONTENT_DISCLOSURE.txt',
  'public/legal/THIRD_PARTY_NOTICES.txt',
  'public/legal/RUST_THIRD_PARTY_NOTICES.txt',
  'docs/EULA.md',
  'docs/PRIVACY.md',
  'docs/SUPPORT.md',
  'docs/AI_GENERATION_DISCLOSURE.md',
  'docs/THIRD_PARTY_LICENCE_REVIEW.md',
];
const blockers: string[] = [];
const warnings: string[] = [];

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    blockers.push(`Missing required disclosure: ${relativePath}`);
    continue;
  }
  const content = readFileSync(absolutePath, 'utf8');
  if (content.trim().length < 200) blockers.push(`Disclosure is unexpectedly short: ${relativePath}`);
  if (/\b(?:TODO|TBD|example\.com)\b/i.test(content)) blockers.push(`Placeholder text remains in: ${relativePath}`);
}

const privacy = existsSync(path.join(root, 'public/legal/PRIVACY.txt'))
  ? readFileSync(path.join(root, 'public/legal/PRIVACY.txt'), 'utf8')
  : '';
if (!/stored (?:only )?(?:locally (?:in the browser|on (?:the |this )?device)|on (?:this )?device)|local (?:site )?storage/i.test(privacy)) blockers.push('Privacy notice does not clearly disclose local storage.');
if (!/not (?:sent|upload)|never (?:sent|upload)|does not (?:send|upload)/i.test(privacy)) blockers.push('Privacy notice does not clearly disclose that data is not automatically uploaded.');
if (!/clear|delete/i.test(privacy)) blockers.push('Privacy notice does not explain data deletion.');

const support = existsSync(path.join(root, 'public/legal/SUPPORT.txt'))
  ? readFileSync(path.join(root, 'public/legal/SUPPORT.txt'), 'utf8')
  : '';
if (!/issue report/i.test(support) || !/storefront|distribution/i.test(support)) blockers.push('Support notice lacks the issue-report or support-route workflow.');
if (/dedicated public support address.*before/i.test(support)) warnings.push('A dedicated public support address remains a pre-release action for direct distribution outside a storefront.');

const dependencyPath = path.join(root, 'reports', 'commercial-release', 'dependency-licences.json');
let dependencies: DependencyReport = {};
if (!existsSync(dependencyPath)) {
  blockers.push('Dependency licence report has not been generated.');
} else {
  dependencies = JSON.parse(readFileSync(dependencyPath, 'utf8')) as DependencyReport;
  if ((dependencies.unresolved?.length ?? 0) > 0) blockers.push(`${dependencies.unresolved!.length} dependency licence declarations require resolution.`);
  if ((dependencies.missingLicenceFiles?.length ?? 0) > 0) warnings.push(`${dependencies.missingLicenceFiles!.length} permissively licensed packages do not bundle a separate licence file; declarations and source links remain in the notice.`);
}

const rustDependencyPath = path.join(root, 'reports', 'commercial-release', 'rust-dependency-licences.json');
if (!existsSync(rustDependencyPath)) {
  blockers.push('Rust/Tauri dependency licence report has not been generated.');
} else {
  const rustDependencies = JSON.parse(readFileSync(rustDependencyPath, 'utf8')) as DependencyReport;
  if ((rustDependencies.unresolved?.length ?? 0) > 0) blockers.push(`${rustDependencies.unresolved!.length} Rust/Tauri dependency licence declarations require resolution.`);
  if ((rustDependencies.missingLicenceFiles?.length ?? 0) > 0) warnings.push(`${rustDependencies.missingLicenceFiles!.length} permissively licensed Rust/Tauri packages do not bundle a separate licence file; declarations and source links remain in the notice.`);
}

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: blockers.length ? 'BLOCKED' : 'PASS',
  dependencyPackages: dependencies.packageCount ?? 0,
  uniqueLicenceTexts: dependencies.licenceTextCount ?? 0,
  blockers,
  warnings,
};
mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Commercial legal audit: ${result.status}`);
console.log(`Dependencies: ${result.dependencyPackages}; unique licence texts: ${result.uniqueLicenceTexts}; warnings: ${warnings.length}`);
warnings.forEach((warning) => console.warn(`WARNING: ${warning}`));
blockers.forEach((blocker) => console.error(`BLOCKER: ${blocker}`));
if (blockers.length) process.exitCode = 1;
