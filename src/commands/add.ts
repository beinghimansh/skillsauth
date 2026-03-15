import * as p from '@clack/prompts';
import chalk from 'chalk';
import { fetchRepo, fetchSkill, recordDownload, APIError } from '../lib/api.js';
import { detectAgents } from '../lib/agents.js';
import { installSkill } from '../lib/installer.js';
import { addSkillToLockfile } from '../lib/lockfile.js';
import { printScanBadge, printError, separator } from '../utils/display.js';
import { SKIP_PROMPTS } from '../utils/constants.js';
import type { CLISkill, AgentType, InstallScope } from '../types.js';

export async function addCommand(
  repoArg: string,
  specificSkill: string | undefined,
  opts: { global?: boolean; yes?: boolean }
): Promise<void> {
  const parts = repoArg.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    printError('Use: skillsauth add owner/repo');
    process.exit(1);
  }
  
  const [owner, repo] = parts;
  const scope: InstallScope = opts.global ? 'global' : 'local';
  const skipAll = opts.yes || SKIP_PROMPTS;

  p.intro(chalk.bold('◆ SkillsAuth') + chalk.dim(' — Trusted AI Agent Skills'));

  const spinner = p.spinner();
  spinner.start(`Fetching skills from ${chalk.cyan(repoArg)}...`);

  let skills: CLISkill[];
  try {
    if (specificSkill) {
      const slug = `${owner}-${repo}-${specificSkill}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      try {
        skills = [await fetchSkill(owner, repo, slug)];
      } catch (e) {
        if (e instanceof APIError && e.status === 404) {
          const { skills: repoSkills } = await fetchRepo(owner, repo);
          const matched = repoSkills.find(
            (s) => s.name.toLowerCase() === specificSkill.toLowerCase()
          );
          if (matched) skills = [matched];
          else throw e;
        } else throw e;
      }
    } else {
      skills = (await fetchRepo(owner, repo)).skills;
    }
    spinner.stop(`Found ${chalk.green(skills.length)} verified skill(s) ${chalk.dim('(all scan-clean)')}`);
  } catch (e: unknown) {
    spinner.stop('Failed');
    if (e instanceof APIError) {
      if (e.status === 404) printError(`No published skills found for ${repoArg}`);
      else if (e.status === 403) printError(`Skills from ${repoArg} are quarantined (failed security scan)`);
      else printError(e.message);
    } else {
      const error = e as Error;
      printError(error.message);
    }
    process.exit(1);
  }

  // Select skills
  let selectedSkills: CLISkill[] = skills;
  if (!skipAll && !specificSkill) {
    const sel = await p.multiselect({
      message: 'Which skills to install?',
      options: skills.map((s) => ({
        value: s.slug,
        label: `${s.name.padEnd(24)} ${chalk.dim(s.description.slice(0, 50))}`,
        hint: `★${(s.stars ?? 0) >= 1000 ? Math.floor((s.stars ?? 0) / 1000) + 'k' : s.stars ?? 0}`,
      })),
      required: true,
    });
    if (p.isCancel(sel)) {
      p.cancel('Cancelled');
      process.exit(0);
    }
    selectedSkills = skills.filter((s) => (sel as string[]).includes(s.slug));
  }

  // Select scope
  let finalScope = scope;
  if (!opts.global && !skipAll) {
    const s = await p.select({
      message: 'Install scope?',
      options: [
        { value: 'local', label: 'Local  (this project)', hint: '.cursor/skills/, .claude/skills/' },
        { value: 'global', label: 'Global (all projects)', hint: '~/.cursor/skills/, ~/.claude/skills/' },
      ],
    });
    if (p.isCancel(s)) {
      p.cancel('Cancelled');
      process.exit(0);
    }
    finalScope = s as InstallScope;
  }

  // Select agents
  const agentList = detectAgents(finalScope, process.cwd());
  let selectedAgents: AgentType[];

  if (skipAll) {
    selectedAgents = agentList.filter((a) => a.detected).map((a) => a.id);
    if (selectedAgents.length === 0) selectedAgents = ['claude-code'];
  } else {
    const ag = await p.multiselect({
      message: 'Install to which AI agents?',
      options: agentList.map((a) => ({
        value: a.id,
        label: a.name,
        hint: a.detected ? 'detected ✓' : 'not found',
      })),
      initialValues: agentList.filter((a) => a.detected).map((a) => a.id),
    });
    if (p.isCancel(ag)) {
      p.cancel('Cancelled');
      process.exit(0);
    }
    selectedAgents = ag as AgentType[];
  }

  if (selectedAgents.length === 0) {
    printError('No agents selected');
    process.exit(1);
  }

  // Security notice + confirmation
  if (!skipAll) {
    separator();
    console.log(chalk.yellow('  ⚠  Security Notice'));
    console.log(chalk.dim(`     Publisher: ${owner}/${repo}`));
    printScanBadge(selectedSkills[0]);
    separator();
    const ok = await p.confirm({
      message: `Confirm install of ${selectedSkills.length} skill(s) to ${selectedAgents.join(', ')}?`,
    });
    if (p.isCancel(ok) || !ok) {
      p.cancel('Cancelled');
      process.exit(0);
    }
  }

  // Install
  console.log('');
  for (const skill of selectedSkills) {
    const results = installSkill(skill, selectedAgents, finalScope);
    for (const r of results) {
      if (r.status === 'error') {
        console.log(chalk.red(`  ✗ ${skill.name} → ${r.path}: ${r.error}`));
      } else if (r.status === 'skipped') {
        console.log(chalk.dim(`  ○ ${skill.name} → ${r.path} (unchanged)`));
      } else {
        console.log(chalk.green(`  ✓ `) + `${skill.repoOwner}/${skill.name} → ${r.path}`);
        recordDownload(skill.id, r.agent);
      }
    }
    addSkillToLockfile(finalScope, {
      slug: skill.slug,
      name: skill.name,
      repoOwner: skill.repoOwner,
      repoName: skill.repoName,
      version: skill.version,
      sha: skill.sha,
      description: skill.description,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agents: selectedAgents,
      scope: finalScope,
      paths: Object.fromEntries(
        results.filter((r) => r.status !== 'error').map((r) => [r.agent, r.path])
      ),
    });
  }

  console.log(chalk.green('\n  ✓ ') + chalk.dim('Updated .skillsai-lock.json'));
  p.outro(chalk.dim("Run 'skillsauth installed' to see all installed skills."));
}
