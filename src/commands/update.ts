import * as p from '@clack/prompts';
import chalk from 'chalk';
import { fetchSkill, APIError } from '../lib/api.js';
import { getAllInstalled, addSkillToLockfile } from '../lib/lockfile.js';
import { installSkill } from '../lib/installer.js';
import { printError } from '../utils/display.js';
import type { InstallScope } from '../types.js';

export async function updateCommand(opts: { global?: boolean }): Promise<void> {
  const scope: InstallScope = opts.global ? 'global' : 'local';
  const installed = getAllInstalled(scope);
  
  if (!installed.length) {
    console.log(chalk.dim('\n  No skills installed.\n'));
    return;
  }
  
  p.intro(`Checking ${installed.length} skill(s) for updates...`);
  
  let updated = 0;
  let quarantined = 0;
  let errors = 0;
  
  for (const skill of installed) {
    try {
      const latest = await fetchSkill(skill.repoOwner, skill.repoName, skill.slug);
      
      if (latest.sha === skill.sha) {
        console.log(chalk.dim(`  ○ ${skill.slug} (up to date)`));
        continue;
      }
      
      installSkill(latest, skill.agents, scope, true);
      addSkillToLockfile(scope, { ...skill, sha: latest.sha, version: latest.version });
      console.log(chalk.green(`  ✓ ${skill.slug}`) + chalk.dim(` → v${latest.version}`));
      updated++;
    } catch (e: unknown) {
      if (e instanceof APIError && e.status === 403) {
        console.log(
          chalk.red(`  ✗ ${skill.slug} QUARANTINED — run: skillsauth remove ${skill.slug}`)
        );
        quarantined++;
      } else {
        const error = e as Error;
        printError(`${skill.slug}: ${error.message}`);
        errors++;
      }
    }
  }
  
  p.outro(`${updated} updated · ${quarantined} quarantine warnings · ${errors} errors`);
}
