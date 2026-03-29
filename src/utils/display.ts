import chalk from 'chalk';
import type { CLISkill, InstalledSkill } from '../types.js';
import { getDisplayName } from '../lib/agents.js';

export const printError = (m: string): void => console.error(chalk.red('  ✗ ') + chalk.red(m));
export const printSuccess = (m: string): void => console.log(chalk.green('  ✓ ') + m);
export const printWarning = (m: string): void => console.log(chalk.yellow('  ⚠ ') + m);
export const separator = (): void => console.log(chalk.dim('  ' + '─'.repeat(60)));

export function printSkillRow(s: CLISkill, i?: number): void {
  const num = i !== undefined ? chalk.dim(`${i + 1}.`) : ' ';
  const name = chalk.white.bold(s.name.padEnd(28));
  const desc = chalk.dim(
    (s.description.length > 50 ? s.description.slice(0, 49) + '…' : s.description).padEnd(52)
  );
  const starCount = s.stars ?? 0;
  const stars = chalk.yellow(
    `★${starCount >= 1000 ? Math.floor(starCount / 1000) + 'k' : starCount}`
  );
  console.log(`  ${num} ${name} ${desc}  ${stars}`);
}

export function printInstalledRow(s: InstalledSkill): void {
  const name = chalk.white.bold(s.slug.padEnd(36));
  const agents = s.agents.map((a) => chalk.cyan(getDisplayName(a))).join(', ');
  const version = chalk.dim(`v${s.version}`);
  console.log(`  ${name} ${version}   ${agents}`);
}

export function printScanBadge(s: CLISkill): void {
  const date = s.scannedAt ? new Date(s.scannedAt).toLocaleDateString() : 'recently';
  console.log(
    chalk.dim(`     Scanned: ${date}`) +
      chalk.green(' ✓ mcp-scan') +
      chalk.green(' ✓ Semgrep') +
      chalk.green(' ✓ VirusTotal')
  );
}
