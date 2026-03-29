import chalk from 'chalk';
import { fetchSkill, APIError } from '../lib/api.js';
import { getAllInstalled } from '../lib/lockfile.js';
import { printError } from '../utils/display.js';
import type { InstallScope } from '../types.js';

interface CheckOptions {
  global?: boolean;
  json?: boolean;
}

export async function checkCommand(opts: CheckOptions): Promise<void> {
  const scope: InstallScope = opts.global ? 'global' : 'local';
  const installed = getAllInstalled(scope);

  if (!installed.length) {
    console.log(chalk.dim(`\n  No ${scope} skills installed.\n`));
    return;
  }

  console.log(chalk.dim(`\n  Checking ${installed.length} skill(s) for updates...\n`));

  const results: Array<{ slug: string; current: string; latest: string; status: string }> = [];

  for (const skill of installed) {
    try {
      const latest = await fetchSkill(skill.repoOwner, skill.repoName, skill.slug);
      if (latest.sha === skill.sha) {
        results.push({ slug: skill.slug, current: skill.version, latest: latest.version, status: 'up-to-date' });
        if (!opts.json) console.log(chalk.dim(`  ○ ${skill.slug.padEnd(36)} v${skill.version} (up to date)`));
      } else {
        results.push({ slug: skill.slug, current: skill.version, latest: latest.version, status: 'outdated' });
        if (!opts.json) {
          console.log(
            chalk.yellow(`  ↑ ${skill.slug.padEnd(36)}`) +
            chalk.dim(`v${skill.version}`) +
            chalk.yellow(` → v${latest.version}`)
          );
        }
      }
    } catch (e: unknown) {
      if (e instanceof APIError && e.status === 403) {
        results.push({ slug: skill.slug, current: skill.version, latest: '?', status: 'quarantined' });
        if (!opts.json) console.log(chalk.red(`  ✗ ${skill.slug.padEnd(36)} QUARANTINED`));
      } else {
        results.push({ slug: skill.slug, current: skill.version, latest: '?', status: 'error' });
        if (!opts.json) console.log(chalk.red(`  ✗ ${skill.slug.padEnd(36)} error: ${(e as Error).message}`));
      }
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ scope, skills: results }, null, 2));
    return;
  }

  const outdated = results.filter((r) => r.status === 'outdated').length;
  console.log('');
  if (outdated > 0) {
    console.log(chalk.yellow(`  ${outdated} skill(s) can be updated. Run: skillsauth update${opts.global ? ' -g' : ''}`));
  } else {
    console.log(chalk.green('  All skills are up to date.'));
  }
  console.log('');
}
