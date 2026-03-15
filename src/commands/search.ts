import * as p from '@clack/prompts';
import chalk from 'chalk';
import { searchSkills } from '../lib/api.js';
import { printSkillRow, printError } from '../utils/display.js';

export async function searchCommand(
  query: string,
  opts: { limit?: number }
): Promise<void> {
  const spinner = p.spinner();
  spinner.start(`Searching "${chalk.cyan(query)}"...`);
  
  try {
    const { results, total } = await searchSkills(query, opts.limit ?? 10);
    spinner.stop(`${total} result(s) for "${query}"`);
    
    if (!results.length) {
      console.log(chalk.dim('\n  No results found.\n'));
      return;
    }
    
    console.log('');
    results.forEach((s, i) => printSkillRow(s, i));
    console.log('');
    console.log(chalk.dim('  Install: npx skillsauth add owner/repo skill-name'));
  } catch (e: unknown) {
    const error = e as Error;
    spinner.stop('Failed');
    printError(error.message);
    process.exit(1);
  }
}
