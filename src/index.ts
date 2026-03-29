#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { addCommand } from './commands/add.js';
import { addLocalCommand } from './commands/add-local.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { findCommand } from './commands/find.js';
import { installedCommand } from './commands/installed.js';
import { updateCommand } from './commands/update.js';
import { removeCommand } from './commands/remove.js';
import { initCommand } from './commands/init.js';
import { checkCommand } from './commands/check.js';
import { AGENT_IDS } from './types.js';

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf8')
) as { version: string };

const program = new Command()
  .name('skillsauth')
  .description('Install verified AI agent skills from the SkillsAuth marketplace')
  .version(pkg.version);

// --- add / install ---
const addCmd = new Command('add')
  .alias('install')
  .alias('i')
  .argument('<source>', 'Repository (owner/repo) or local path (./ or /path)')
  .argument('[skill...]', 'Optional skill name or slug')
  .description('Install skills from a repository or local directory (with plugin manifest support)')
  .option('-g, --global', 'Install globally')
  .option('-y, --yes', 'Skip all prompts')
  .option('--copy', 'Copy files instead of symlink')
  .option('--agent <agents...>', 'Target specific agent(s)')
  .option('--all', 'Install all skills without prompting')
  .option('--json', 'Output results as JSON')
  .action((source: string, skillArgs: string[], opts) => {
    const isLocal = source.startsWith('.') || source.startsWith('/') || source.startsWith('\\') || existsSync(source);
    if (isLocal) {
      return addLocalCommand(source, opts);
    }
    const skill = skillArgs?.length ? skillArgs.join(' ') : undefined;
    return addCommand(source, skill, opts);
  });
program.addCommand(addCmd);

// --- list / ls ---
const listCmd = new Command('list')
  .alias('ls')
  .argument('<repo>', 'Repository (owner/repo)')
  .description('List skills in a repository')
  .action(listCommand);
program.addCommand(listCmd);

// --- search ---
program
  .command('search <query>')
  .description('Search the marketplace')
  .option('-l, --limit <n>', 'Max results', '10')
  .action((q: string, o: { limit: string }) => {
    const n = parseInt(o.limit, 10);
    return searchCommand(q, { limit: Number.isFinite(n) && n > 0 ? n : 10 });
  });

// --- find (interactive search) ---
program
  .command('find [query]')
  .description('Interactive skill discovery')
  .option('-l, --limit <n>', 'Max results', '20')
  .option('--json', 'Output results as JSON')
  .action((q: string | undefined, o: { limit: string; json?: boolean }) => {
    const n = parseInt(o.limit, 10);
    return findCommand(q, { limit: Number.isFinite(n) && n > 0 ? n : 20, json: o.json });
  });

// --- installed / status ---
const installedCmd = new Command('installed')
  .alias('status')
  .description('Show installed skills')
  .option('-g, --global', 'Show global installs')
  .option('--json', 'Output as JSON')
  .action(installedCommand);
program.addCommand(installedCmd);

// --- update / upgrade ---
const updateCmd = new Command('update')
  .alias('upgrade')
  .description('Update all installed skills')
  .option('-g, --global', 'Update global installs')
  .action(updateCommand);
program.addCommand(updateCmd);

// --- check ---
program
  .command('check')
  .description('Check for available updates without installing')
  .option('-g, --global', 'Check global installs')
  .option('--json', 'Output as JSON')
  .action(checkCommand);

// --- remove / uninstall / rm ---
const removeCmd = new Command('remove')
  .alias('uninstall')
  .alias('rm')
  .argument('<slug>', 'Skill slug to remove')
  .description('Remove an installed skill')
  .option('-g, --global', 'Remove from global install')
  .option('-y, --yes', 'Skip confirmation')
  .action(removeCommand);
program.addCommand(removeCmd);

// --- init ---
program
  .command('init')
  .description('Scaffold a new skill or plugin')
  .option('--plugin', 'Scaffold a multi-skill plugin with manifests')
  .option('-y, --yes', 'Skip prompts (use defaults)')
  .action(initCommand);

// --- agents ---
program
  .command('agents')
  .description('List all supported agents')
  .option('--json', 'Output as JSON')
  .action((opts: { json?: boolean }) => {
    if (opts.json) {
      console.log(JSON.stringify(Array.from(AGENT_IDS), null, 2));
    } else {
      console.log(`\n  Supported agents (${AGENT_IDS.length}):\n`);
      for (const id of AGENT_IDS) {
        console.log(`    ${id}`);
      }
      console.log('');
    }
  });

program.parse();
