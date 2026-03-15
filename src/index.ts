#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { installedCommand } from './commands/installed.js';
import { updateCommand } from './commands/update.js';
import { removeCommand } from './commands/remove.js';

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf8')
) as { version: string };

const program = new Command()
  .name('skillsauth')
  .description('Install verified AI agent skills from the SkillsAI marketplace')
  .version(pkg.version);

program
  .command('add <repo> [skill]')
  .description('Install skills (format: owner/repo)')
  .option('-g, --global', 'Install globally')
  .option('-y, --yes', 'Skip all prompts')
  .action(addCommand);

program
  .command('list <repo>')
  .description('List skills in a repo')
  .action(listCommand);

program
  .command('search <query>')
  .description('Search the marketplace')
  .option('-l, --limit <n>', 'Max results', '10')
  .action((q: string, o: { limit: string }) => searchCommand(q, { limit: parseInt(o.limit) }));

program
  .command('installed')
  .description('Show installed skills')
  .option('-g, --global', 'Show global installs')
  .action(installedCommand);

program
  .command('update')
  .description('Update all installed skills')
  .option('-g, --global', 'Update global installs')
  .action(updateCommand);

program
  .command('remove <slug>')
  .description('Remove an installed skill')
  .option('-g, --global', 'Remove from global install')
  .option('-y, --yes', 'Skip confirmation')
  .action(removeCommand);

program.parse();
