import * as p from '@clack/prompts';
import chalk from 'chalk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { printError, printSuccess } from '../utils/display.js';

interface InitOptions {
  plugin?: boolean;
  yes?: boolean;
}

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function scaffoldSkill(dir: string, name: string, description: string): void {
  mkdirSync(dir, { recursive: true });
  const md = `---
name: ${name}
description: "${description}"
version: "1.0.0"
---

# ${name}

${description}

## When to use

Describe when and how an AI agent should activate this skill.

## Instructions

1. Step one
2. Step two
`;
  writeFileSync(join(dir, 'SKILL.md'), md, 'utf8');
}

function scaffoldPlugin(baseDir: string, pluginName: string, skillName: string, description: string): void {
  const skillDir = join(baseDir, 'skills', skillName);
  scaffoldSkill(skillDir, skillName, description);

  // Claude Code manifest
  const claudeDir = join(baseDir, '.claude-plugin');
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(join(claudeDir, 'plugin.json'), JSON.stringify({
    name: pluginName,
    version: '1.0.0',
    description,
    skills: [`./skills/${skillName}/SKILL.md`],
  }, null, 2) + '\n', 'utf8');

  // Cursor manifest
  const cursorDir = join(baseDir, '.cursor-plugin');
  mkdirSync(cursorDir, { recursive: true });
  writeFileSync(join(cursorDir, 'plugin.json'), JSON.stringify({
    name: pluginName,
    version: '1.0.0',
    description,
    skills: 'skills/',
  }, null, 2) + '\n', 'utf8');

  // README
  writeFileSync(join(baseDir, 'README.md'), `# ${pluginName}

${description}

## Skills

- **${skillName}** — ${description}

## Install

\`\`\`bash
npx skillsauth add ./${baseDir}
\`\`\`

Or install manually: copy the \`skills/\` folder into your project's \`.agents/skills/\` directory.
`, 'utf8');
}

export async function initCommand(opts: InitOptions): Promise<void> {
  p.intro(chalk.bold('◆ SkillsAuth Init'));

  if (opts.plugin) {
    const nameResult = await p.text({
      message: 'Plugin name (kebab-case):',
      placeholder: 'my-awesome-plugin',
      validate: (v) => (v.trim().length < 2 ? 'Name too short' : undefined),
    });
    if (p.isCancel(nameResult)) { p.cancel('Cancelled'); return; }
    const pluginName = kebab(nameResult as string);

    const descResult = await p.text({
      message: 'Description:',
      placeholder: 'A collection of useful AI agent skills',
    });
    if (p.isCancel(descResult)) { p.cancel('Cancelled'); return; }
    const description = (descResult as string) || 'A plugin for AI agent skills';

    const skillNameResult = await p.text({
      message: 'First skill name:',
      placeholder: 'my-first-skill',
      validate: (v) => (v.trim().length < 2 ? 'Name too short' : undefined),
    });
    if (p.isCancel(skillNameResult)) { p.cancel('Cancelled'); return; }
    const skillName = kebab(skillNameResult as string);

    const dir = pluginName;
    if (existsSync(dir)) {
      printError(`Directory "${dir}" already exists`);
      process.exit(1);
    }

    scaffoldPlugin(dir, pluginName, skillName, description);
    printSuccess(`Plugin scaffolded in ${chalk.cyan(dir)}/`);
    console.log(chalk.dim(`\n  ${dir}/`));
    console.log(chalk.dim(`  ├── .claude-plugin/plugin.json`));
    console.log(chalk.dim(`  ├── .cursor-plugin/plugin.json`));
    console.log(chalk.dim(`  ├── skills/${skillName}/SKILL.md`));
    console.log(chalk.dim(`  └── README.md`));
  } else {
    const nameResult = await p.text({
      message: 'Skill name (kebab-case):',
      placeholder: 'my-awesome-skill',
      validate: (v) => (v.trim().length < 2 ? 'Name too short' : undefined),
    });
    if (p.isCancel(nameResult)) { p.cancel('Cancelled'); return; }
    const name = kebab(nameResult as string);

    const descResult = await p.text({
      message: 'Description:',
      placeholder: 'Briefly describe what this skill does',
    });
    if (p.isCancel(descResult)) { p.cancel('Cancelled'); return; }
    const description = (descResult as string) || 'An AI agent skill';

    const dir = join('.', name);
    if (existsSync(join(dir, 'SKILL.md'))) {
      printError(`SKILL.md already exists in ${dir}/`);
      process.exit(1);
    }

    scaffoldSkill(dir, name, description);
    printSuccess(`Skill scaffolded at ${chalk.cyan(dir + '/SKILL.md')}`);
  }

  p.outro(chalk.dim('Edit the SKILL.md to add your instructions.'));
}
