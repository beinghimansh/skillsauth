import * as p from '@clack/prompts';
import chalk from 'chalk';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve, basename, dirname } from 'path';
import { detectAgents } from '../lib/agents.js';
import { discoverPluginSkills, hasPluginManifests } from '../lib/plugin-manifest.js';
import { addSkillToLockfile } from '../lib/lockfile.js';
import { installSkill } from '../lib/installer.js';
import { printError, printSuccess, separator } from '../utils/display.js';
import { SKIP_PROMPTS, LOCAL_LOCK, GLOBAL_LOCK } from '../utils/constants.js';
import { isSafeSkillSlug } from '../utils/slug.js';
import type { CLISkill, AgentType, InstallScope } from '../types.js';
import { AGENT_IDS } from '../types.js';

export interface AddLocalOptions {
  global?: boolean;
  yes?: boolean;
  copy?: boolean;
  agent?: string[];
  all?: boolean;
  json?: boolean;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function readSkillMd(skillDir: string): { name: string; description: string; content: string } | null {
  const mdPath = join(skillDir, 'SKILL.md');
  if (!existsSync(mdPath)) return null;
  const content = readFileSync(mdPath, 'utf-8');

  let name = basename(skillDir);
  let description = '';

  // Parse YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:\s*"?([^"]*)"?$/m);
    if (nameMatch) name = nameMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
  }

  return { name, description, content };
}

function collectFiles(dir: string, base: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  function walk(current: string): void {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        walk(full);
      } else {
        const rel = full.slice(base.length + 1).replace(/\\/g, '/');
        try {
          files.push({ path: rel, content: readFileSync(full, 'utf-8') });
        } catch { /* skip binary files */ }
      }
    }
  }
  walk(dir);
  return files;
}

/**
 * Install skills from a local directory that may contain plugin manifests
 * (.claude-plugin/, .cursor-plugin/) or conventional skill directories.
 */
export async function addLocalCommand(localPath: string, opts: AddLocalOptions): Promise<void> {
  const absPath = resolve(localPath);
  if (!existsSync(absPath)) {
    printError(`Path not found: ${localPath}`);
    process.exit(1);
  }

  const skipAll = opts.yes || SKIP_PROMPTS;
  const scope: InstallScope = opts.global ? 'global' : 'local';
  const copyMode = opts.copy ?? false;

  if (!opts.json) {
    p.intro(chalk.bold('◆ SkillsAuth') + chalk.dim(' — Local Plugin Install'));
  }

  // Discover skills via plugin manifests + conventional dirs
  const hasManifest = hasPluginManifests(absPath);
  const discovered = discoverPluginSkills(absPath);

  if (discovered.length === 0) {
    // Maybe the path itself IS a skill directory
    const direct = readSkillMd(absPath);
    if (direct) {
      const slug = slugify(basename(absPath));
      discovered.push({ name: direct.name, path: absPath, source: 'directory' });
    }
  }

  if (discovered.length === 0) {
    printError('No skills found in the provided path. Expected SKILL.md files in skills/ subdirectories or plugin manifests.');
    process.exit(1);
  }

  if (!opts.json) {
    const sourceLabel = hasManifest ? 'plugin manifests' : 'directory scan';
    console.log(chalk.green(`  Found ${discovered.length} skill(s)`) + chalk.dim(` via ${sourceLabel}`));
    console.log('');
  }

  // Selection
  let selectedSkills = discovered;
  if (!skipAll && !opts.all && discovered.length > 1) {
    // Group by plugin for display
    const pluginGroups = new Map<string, typeof discovered>();
    const ungrouped: typeof discovered = [];
    for (const s of discovered) {
      if (s.pluginName) {
        const group = pluginGroups.get(s.pluginName) ?? [];
        group.push(s);
        pluginGroups.set(s.pluginName, group);
      } else {
        ungrouped.push(s);
      }
    }

    const options = discovered.map((s) => ({
      value: s.path,
      label: s.name,
      hint: s.pluginName ? `[${s.pluginName}] ${s.source}` : s.source,
    }));

    const sel = await p.multiselect({
      message: 'Which skills to install?',
      options,
      required: true,
    });
    if (p.isCancel(sel)) { p.cancel('Cancelled'); return; }
    const selected = new Set(sel as string[]);
    selectedSkills = discovered.filter((s) => selected.has(s.path));
  }

  // Agent selection
  let selectedAgents: AgentType[];
  if (opts.agent?.length) {
    const valid = new Set<string>(AGENT_IDS as readonly string[]);
    selectedAgents = opts.agent.filter((a) => valid.has(a)) as AgentType[];
    if (!selectedAgents.length) {
      printError(`Unknown agent(s): ${opts.agent.join(', ')}`);
      process.exit(1);
    }
  } else {
    const agentList = detectAgents(scope, process.cwd());
    if (skipAll) {
      selectedAgents = agentList.filter((a) => a.detected).map((a) => a.id);
      if (!selectedAgents.length) selectedAgents = ['claude-code'];
    } else {
      const detected = agentList.filter((a) => a.detected);
      const notDetected = agentList.filter((a) => !a.detected);
      const agentOptions: Array<{ value: string; label: string; hint: string }> = [
        ...detected.map((a) => ({ value: a.id, label: a.name, hint: 'detected ✓' })),
        ...notDetected.slice(0, 10).map((a) => ({ value: a.id, label: a.name, hint: '' })),
      ];
      const ag = await p.multiselect({
        message: 'Install to which AI agents?',
        options: agentOptions,
        initialValues: detected.map((a) => a.id),
      });
      if (p.isCancel(ag)) { p.cancel('Cancelled'); return; }
      selectedAgents = (ag as string[]) as AgentType[];
    }
  }

  if (!selectedAgents.length) {
    printError('No agents selected');
    process.exit(1);
  }

  // Install each discovered skill
  const jsonResults: Array<Record<string, unknown>> = [];

  for (const disc of selectedSkills) {
    const info = readSkillMd(disc.path);
    if (!info) continue;

    const slug = slugify(disc.name);
    if (!isSafeSkillSlug(slug)) {
      if (!opts.json) console.log(chalk.yellow(`  ⚠ Skipping "${disc.name}" — invalid slug "${slug}"`));
      continue;
    }

    const files = collectFiles(disc.path, disc.path);
    const fakeSkill: CLISkill = {
      id: `local-${slug}`,
      slug,
      name: info.name,
      description: info.description || 'Locally installed skill',
      version: '0.0.0-local',
      sha: 'local',
      repoOwner: 'local',
      repoName: basename(resolve(absPath)),
      triggerPhrase: '',
      category: 'local',
      stars: 0,
      scanStatus: 'clean',
      scannedAt: null,
      files,
    };

    const results = installSkill(fakeSkill, selectedAgents, scope, true, copyMode);
    for (const r of results) {
      if (opts.json) {
        jsonResults.push({ skill: slug, agent: r.agent, status: r.status, path: r.path, symlink: r.symlink, pluginName: disc.pluginName });
        continue;
      }
      if (r.status === 'error') {
        console.log(chalk.red(`  ✗ ${info.name} → ${r.path}: ${r.error}`));
      } else {
        const sym = r.symlink ? chalk.dim(' [symlink]') : '';
        const plugin = disc.pluginName ? chalk.dim(` (${disc.pluginName})`) : '';
        console.log(chalk.green(`  ✓ `) + `${info.name}${plugin} → ${r.path}${sym}`);
      }
    }

    addSkillToLockfile(scope, {
      slug,
      name: info.name,
      repoOwner: 'local',
      repoName: basename(resolve(absPath)),
      version: '0.0.0-local',
      sha: 'local',
      description: info.description || 'Locally installed skill',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agents: selectedAgents,
      scope,
      paths: Object.fromEntries(
        results.filter((r) => r.status !== 'error').map((r) => [r.agent, r.path])
      ),
    });
  }

  if (opts.json) {
    console.log(JSON.stringify(jsonResults, null, 2));
    return;
  }

  const lockLabel = scope === 'global' ? GLOBAL_LOCK : LOCAL_LOCK;
  console.log(chalk.green('\n  ✓ ') + chalk.dim(`Updated ${lockLabel}`));
  p.outro(chalk.dim("Run 'skillsauth installed' to see all installed skills."));
}
