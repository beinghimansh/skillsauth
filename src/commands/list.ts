import * as p from '@clack/prompts';
import chalk from 'chalk';
import { fetchRepo } from '../lib/api.js';
import { printSkillRow, printError } from '../utils/display.js';

export async function listCommand(repoArg: string): Promise<void> {
  const parts = repoArg.split('/');
  if (parts.length !== 2) {
    printError('Use: skillsauth list owner/repo');
    process.exit(1);
  }
  
  const spinner = p.spinner();
  spinner.start(`Fetching ${chalk.cyan(repoArg)}...`);
  
  try {
    const { skills, totalSkills } = await fetchRepo(parts[0], parts[1]);
    spinner.stop(`${totalSkills} verified skills in ${chalk.cyan(repoArg)}`);
    console.log('');
    skills.forEach((s, i) => printSkillRow(s, i));
    console.log('');
    console.log(chalk.dim(`  Install: npx skillsauth add ${repoArg}`));
  } catch (e: unknown) {
    const error = e as Error;
    spinner.stop('Failed');
    printError(error.message);
    process.exit(1);
  }
}
