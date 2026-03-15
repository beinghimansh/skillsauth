import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getInstalledSkill, removeSkillFromLockfile } from '../lib/lockfile.js';
import { uninstallSkill } from '../lib/installer.js';
import { printError, printSuccess } from '../utils/display.js';
import type { InstallScope } from '../types.js';

export async function removeCommand(
  slug: string,
  opts: { global?: boolean; yes?: boolean }
): Promise<void> {
  const scope: InstallScope = opts.global ? 'global' : 'local';
  const skill = getInstalledSkill(scope, slug);
  
  if (!skill) {
    printError(`"${slug}" is not installed (${scope})`);
    process.exit(1);
  }
  
  if (!opts.yes) {
    const ok = await p.confirm({
      message: `Remove ${chalk.cyan(slug)} from ${skill.agents.join(', ')}?`,
    });
    if (p.isCancel(ok) || !ok) {
      p.cancel('Cancelled');
      return;
    }
  }
  
  uninstallSkill(slug, skill.agents, scope);
  removeSkillFromLockfile(scope, slug);
  printSuccess(`Removed ${slug}`);
}
