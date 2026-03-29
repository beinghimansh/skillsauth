import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  readLockfile,
  writeLockfile,
  addSkillToLockfile,
  removeSkillFromLockfile,
  getInstalledSkill,
  getAllInstalled,
} from '../lib/lockfile.js';
import type { InstalledSkill, Lockfile } from '../types.js';

function makeTmpDir(): string {
  const d = join(tmpdir(), `skillsauth-lock-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(d, { recursive: true });
  return d;
}

const baseSkill: InstalledSkill = {
  slug: 'test-skill',
  name: 'Test Skill',
  repoOwner: 'test',
  repoName: 'repo',
  version: '1.0.0',
  sha: 'abc123',
  description: 'desc',
  installedAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  agents: ['cursor'],
  scope: 'local',
  paths: { cursor: '.cursor/skills/test-skill/SKILL.md' },
};

describe('lockfile', () => {
  let tmpDir: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    origCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  });

  it('readLockfile returns empty when no file exists', () => {
    const lock = readLockfile('local');
    expect(lock.version).toBe(1);
    expect(Object.keys(lock.skills)).toHaveLength(0);
  });

  it('addSkillToLockfile creates and persists', () => {
    addSkillToLockfile('local', baseSkill);
    expect(existsSync('.skillsauth-lock.json')).toBe(true);
    const lock = readLockfile('local');
    expect(lock.skills['test-skill']).toBeDefined();
    expect(lock.skills['test-skill'].version).toBe('1.0.0');
  });

  it('getInstalledSkill returns skill or null', () => {
    expect(getInstalledSkill('local', 'test-skill')).toBeNull();
    addSkillToLockfile('local', baseSkill);
    expect(getInstalledSkill('local', 'test-skill')?.slug).toBe('test-skill');
  });

  it('removeSkillFromLockfile removes entry', () => {
    addSkillToLockfile('local', baseSkill);
    removeSkillFromLockfile('local', 'test-skill');
    expect(getInstalledSkill('local', 'test-skill')).toBeNull();
  });

  it('getAllInstalled returns array', () => {
    addSkillToLockfile('local', baseSkill);
    addSkillToLockfile('local', { ...baseSkill, slug: 'other-skill' });
    expect(getAllInstalled('local')).toHaveLength(2);
  });

  it('preserves installedAt on update', () => {
    addSkillToLockfile('local', baseSkill);
    const original = getInstalledSkill('local', 'test-skill')!.installedAt;
    addSkillToLockfile('local', { ...baseSkill, version: '2.0.0', installedAt: '2099-01-01T00:00:00Z' });
    const updated = getInstalledSkill('local', 'test-skill')!;
    expect(updated.version).toBe('2.0.0');
    expect(updated.installedAt).toBe(original);
  });
});
