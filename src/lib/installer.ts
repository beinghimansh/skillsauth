import {
  writeFileSync, mkdirSync, existsSync, readFileSync, rmSync,
  symlinkSync, lstatSync,
} from 'fs';
import { dirname, join, resolve, sep } from 'path';
import { homedir } from 'os';
import type { CLISkill, AgentType, InstallScope } from '../types.js';
import { AGENT_PATHS } from '../utils/constants.js';
import { isSafeSkillSlug } from '../utils/slug.js';

export interface InstallResult {
  agent: AgentType;
  path: string;
  status: 'installed' | 'updated' | 'skipped' | 'error';
  symlink?: boolean;
  error?: string;
}

export function getInstallPath(slug: string, agent: AgentType, scope: InstallScope): string {
  if (!isSafeSkillSlug(slug)) {
    throw new Error('Invalid skill slug');
  }
  return scope === 'global'
    ? AGENT_PATHS[agent].global(slug)
    : AGENT_PATHS[agent].local(slug);
}

function installTargetIsCanonical(
  skillSlug: string,
  agent: AgentType,
  scope: InstallScope
): boolean {
  const canonicalAbs =
    scope === 'local'
      ? resolve(process.cwd(), '.agents/skills', skillSlug)
      : resolve(join(homedir(), '.agents/skills', skillSlug));
  const filePath = getInstallPath(skillSlug, agent, scope);
  const skillRootAbs =
    scope === 'local' ? resolve(process.cwd(), dirname(filePath)) : resolve(dirname(filePath));
  return skillRootAbs === canonicalAbs;
}

function isPathUnderBase(absPath: string, baseDirAbs: string): boolean {
  const base = resolve(baseDirAbs) + sep;
  const resolved = resolve(absPath);
  return resolved === resolve(baseDirAbs) || resolved.startsWith(base);
}

function writeSkillFiles(
  skill: CLISkill,
  targetDir: string,
  force: boolean
): { anyWritten: boolean; allUnchanged: boolean } {
  let anyWritten = false;
  let allUnchanged = true;

  for (const file of skill.files) {
    if (!file.path || file.path.includes('..') || file.path.startsWith('/')) continue;
    const normalizedPath = file.path.replace(/\\/g, '/');
    const absPath = resolve(join(targetDir, normalizedPath));
    if (!isPathUnderBase(absPath, targetDir)) continue;

    const alreadyExists = existsSync(absPath);
    const content = file.content ?? '';
    if (alreadyExists && !force) {
      try {
        if (readFileSync(absPath, 'utf8') === content) continue;
      } catch {
        // unreadable, overwrite
      }
      allUnchanged = false;
    }
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, 'utf8');
    anyWritten = true;
    allUnchanged = false;
  }
  return { anyWritten, allUnchanged };
}

function trySymlink(target: string, linkPath: string): boolean {
  try {
    mkdirSync(dirname(linkPath), { recursive: true });
    if (existsSync(linkPath)) {
      const stat = lstatSync(linkPath);
      if (stat.isSymbolicLink()) rmSync(linkPath);
      else return false; // real dir already exists, don't replace
    }
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    symlinkSync(target, linkPath, type);
    return true;
  } catch {
    return false;
  }
}

/**
 * Install a skill to the canonical store first, then symlink (or copy) into
 * each agent's expected directory.
 *
 * Canonical store: .agents/skills/<slug>/  (local) or ~/.agents/skills/<slug>/  (global)
 * Agent link:      .<agent>/skills/<slug>/ -> canonical store
 *
 * When `copyMode` is true, files are copied directly to each agent path
 * (no canonical store / no symlink). This is the legacy behaviour.
 */
export function installSkill(
  skill: CLISkill,
  agents: AgentType[],
  scope: InstallScope,
  force = false,
  copyMode = false
): InstallResult[] {
  if (copyMode) {
    return installSkillCopy(skill, agents, scope, force);
  }

  const canonicalRel = `.agents/skills/${skill.slug}`;
  const canonicalAbs = scope === 'local'
    ? resolve(process.cwd(), canonicalRel)
    : resolve(join(homedir(), canonicalRel));

  const { anyWritten, allUnchanged } = writeSkillFiles(skill, canonicalAbs, force);

  return agents.map((agent) => {
    const filePath = getInstallPath(skill.slug, agent, scope);
    const agentSkillDir = scope === 'local'
      ? resolve(process.cwd(), dirname(filePath), '..')
      : resolve(dirname(filePath), '..');

    // Project `.agents/skills/<slug>` matches canonical store — no symlink (SkillsAuth pattern)
    if (installTargetIsCanonical(skill.slug, agent, scope)) {
      if (allUnchanged && !force) return { agent, path: filePath, status: 'skipped' as const };
      return {
        agent,
        path: filePath,
        status: anyWritten ? 'installed' as const : 'skipped' as const,
      };
    }

    const linkTarget = resolve(agentSkillDir, skill.slug);
    const linked = trySymlink(canonicalAbs, linkTarget);

    if (linked) {
      return {
        agent,
        path: filePath,
        status: anyWritten ? 'installed' as const : (allUnchanged && !force ? 'skipped' as const : 'updated' as const),
        symlink: true,
      };
    }

    // Fallback: copy files directly
    try {
      const baseExisted = existsSync(linkTarget);
      const res = writeSkillFiles(skill, linkTarget, force);
      if (res.allUnchanged && !force) return { agent, path: filePath, status: 'skipped' as const };
      return {
        agent,
        path: filePath,
        status: (res.anyWritten ? (baseExisted ? 'updated' : 'installed') : 'skipped') as InstallResult['status'],
      };
    } catch (e: unknown) {
      return { agent, path: filePath, status: 'error' as const, error: (e as Error).message };
    }
  });
}

function installSkillCopy(
  skill: CLISkill,
  agents: AgentType[],
  scope: InstallScope,
  force: boolean
): InstallResult[] {
  return agents.map((agent) => {
    const filePath = getInstallPath(skill.slug, agent, scope);
    const baseDirRel = dirname(filePath);
    const baseDirAbs = scope === 'local' ? resolve(process.cwd(), baseDirRel) : resolve(baseDirRel);

    try {
      const baseExisted = existsSync(baseDirAbs);
      const { anyWritten, allUnchanged } = writeSkillFiles(skill, baseDirAbs, force);
      if (allUnchanged && !force) return { agent, path: filePath, status: 'skipped' as const };
      const status: 'installed' | 'updated' | 'skipped' = anyWritten
        ? (baseExisted ? 'updated' : 'installed')
        : 'skipped';
      return { agent, path: filePath, status };
    } catch (e: unknown) {
      return { agent, path: filePath, status: 'error' as const, error: (e as Error).message };
    }
  });
}

export function uninstallSkill(slug: string, agents: AgentType[], scope: InstallScope): void {
  if (!isSafeSkillSlug(slug)) return;

  // Remove from each agent directory
  agents.forEach((agent) => {
    const p = getInstallPath(slug, agent, scope);
    const skillBaseDir = scope === 'local' ? join(process.cwd(), dirname(p)) : dirname(p);
    try {
      if (existsSync(skillBaseDir)) {
        rmSync(skillBaseDir, { recursive: true, force: true });
      }
    } catch {
      // already missing or permission error
    }
  });

  // Also clean up canonical store
  const canonicalRel = `.agents/skills/${slug}`;
  const canonicalAbs = scope === 'local'
    ? resolve(process.cwd(), canonicalRel)
    : resolve(join(homedir(), canonicalRel));
  try {
    if (existsSync(canonicalAbs)) {
      rmSync(canonicalAbs, { recursive: true, force: true });
    }
  } catch {
    // best-effort
  }
}
