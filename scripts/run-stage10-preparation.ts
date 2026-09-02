import { spawnSync } from 'node:child_process';

const steps = [
  ['pnpm', ['lint']], ['pnpm', ['test']], ['pnpm', ['simulation:audit']], ['pnpm', ['balance:certify']],
  ['pnpm', ['build']], ['pnpm', ['consumer:audit']], ['pnpm', ['offline:verify']], ['pnpm', ['test:e2e']],
  ['pnpm', ['visual:manifest:audit']], ['pnpm', ['stage7:freeze:audit']],
  ['pnpm', ['legal:generate']], ['pnpm', ['rights:audit']], ['pnpm', ['legal:audit']], ['pnpm', ['stage9:audit']],
  ['pnpm', ['desktop:release']], ['pnpm', ['stage8:gate']], ['pnpm', ['stage10:identity']], ['pnpm', ['stage10:test:e2e']],
  ['pnpm', ['stage10:manifest']], ['pnpm', ['stage10:audit']],
] as const;
for (const [command, args] of steps) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
