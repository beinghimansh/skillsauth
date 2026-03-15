import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { LOCAL_LOCK, GLOBAL_LOCK, LOCKFILE_VERSION, GLOBAL_DIR } from '../utils/constants.js';
import type { Lockfile, InstalledSkill, InstallScope } from '../types.js';

const getPath = (scope: InstallScope): string =>
  scope === 'global' ? GLOBAL_LOCK : LOCAL_LOCK;

const empty = (): Lockfile => ({
  version: LOCKFILE_VERSION,
  generatedAt: new Date().toISOString(),
  skills: {},
});

export function readLockfile(scope: InstallScope): Lockfile {
  const path = getPath(scope);
  if (!existsSync(path)) return empty();
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Lockfile;
  } catch {
    return empty();
  }
}

export function writeLockfile(scope: InstallScope, lock: Lockfile): void {
  const path = getPath(scope);
  lock.generatedAt = new Date().toISOString();
  if (scope === 'global' && !existsSync(GLOBAL_DIR)) {
    mkdirSync(GLOBAL_DIR, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(lock, null, 2) + '\n', 'utf8');
}

export function addSkillToLockfile(scope: InstallScope, skill: InstalledSkill): void {
  const lock = readLockfile(scope);
  const prev = lock.skills[skill.slug];
  lock.skills[skill.slug] = {
    ...skill,
    installedAt: prev?.installedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeLockfile(scope, lock);
}

export function removeSkillFromLockfile(scope: InstallScope, slug: string): void {
  const lock = readLockfile(scope);
  delete lock.skills[slug];
  writeLockfile(scope, lock);
}

export const getInstalledSkill = (scope: InstallScope, slug: string): InstalledSkill | null =>
  readLockfile(scope).skills[slug] ?? null;

export const getAllInstalled = (scope: InstallScope): InstalledSkill[] =>
  Object.values(readLockfile(scope).skills);
