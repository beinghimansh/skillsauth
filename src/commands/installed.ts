import chalk from 'chalk';
import { getAllInstalled } from '../lib/lockfile.js';
import { printInstalledRow } from '../utils/display.js';

export function installedCommand(opts: { global?: boolean; json?: boolean }): void {
  const scope = opts.global ? 'global' : 'local';
  const skills = getAllInstalled(scope);

  if (opts.json) {
    console.log(JSON.stringify({ scope, count: skills.length, skills }, null, 2));
    return;
  }

  if (!skills.length) {
    console.log(chalk.dim(`\n  No ${scope} skills installed.\n`));
    console.log(chalk.dim('  Install: npx skillsauth add owner/repo\n'));
    return;
  }

  console.log('');
  console.log(chalk.dim('  ' + 'SKILL'.padEnd(38) + 'VERSION'.padEnd(12) + 'AGENTS'));
  console.log(chalk.dim('  ' + '─'.repeat(60)));
  skills.forEach((s) => printInstalledRow(s));
  console.log('');
  console.log(chalk.dim(`  ${skills.length} skill(s) — ${scope}`));
  console.log('');
}
