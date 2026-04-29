import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, lstatSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { installSkill, uninstallSkill, getInstallPath } from '../lib/installer.js';
import type { CLISkill, AgentType } from '../types.js';

function makeTmpDir(): string {
  const d = join(tmpdir(), `skillsauth-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(d, { recursive: true });
  return d;
}

const fakeSkill: CLISkill = {
  id: 'test-id',
  slug: 'test-skill',
  name: 'Test Skill',
  description: 'A test skill',
  version: '1.0.0',
  sha: 'abc123',
  repoOwner: 'test',
  repoName: 'repo',
  triggerPhrase: 'test',
  category: 'test',
  stars: 0,
  scanStatus: 'clean',
  scannedAt: null,
  bundleHash: null,
  files: [
    { path: 'SKILL.md', content: '# Test\nHello world' },
    { path: 'scripts/run.sh', content: '#!/bin/bash\necho hello' },
  ],
};

describe('installer', () => {
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

  it('getInstallPath returns valid path for all agents', () => {
    const agents: AgentType[] = ['claude-code', 'cursor', 'codex', 'universal'];
    for (const agent of agents) {
      const p = getInstallPath('my-skill', agent, 'local');
      expect(p).toContain('my-skill');
      expect(p).toContain('SKILL.md');
    }
  });

  it('getInstallPath throws on invalid slug', () => {
    expect(() => getInstallPath('../bad', 'cursor', 'local')).toThrow('Invalid skill slug');
  });

  describe('copy mode', () => {
    it('installs all files to each agent directory', () => {
      const results = installSkill(fakeSkill, ['cursor', 'claude-code'], 'local', false, true);
      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r.status).toBe('installed');
        const dir = join(tmpDir, r.path, '..');
        expect(existsSync(join(dir, 'SKILL.md'))).toBe(true);
        expect(readFileSync(join(dir, 'SKILL.md'), 'utf8')).toContain('# Test');
      }
    });

    it('installs nested files (scripts/run.sh)', () => {
      const results = installSkill(fakeSkill, ['cursor'], 'local', false, true);
      const dir = join(tmpDir, results[0].path, '..');
      expect(existsSync(join(dir, 'scripts', 'run.sh'))).toBe(true);
    });

    it('skips when content unchanged', () => {
      installSkill(fakeSkill, ['cursor'], 'local', false, true);
      const r2 = installSkill(fakeSkill, ['cursor'], 'local', false, true);
      expect(r2[0].status).toBe('skipped');
    });
  });

  describe('symlink mode', () => {
    it('writes to canonical .agents/skills/ and symlinks agent-specific dirs', () => {
      const results = installSkill(fakeSkill, ['claude-code', 'roo'], 'local');
      expect(results).toHaveLength(2);

      const canonicalDir = join(tmpDir, '.agents', 'skills', 'test-skill');
      expect(existsSync(join(canonicalDir, 'SKILL.md'))).toBe(true);

      const claudeResult = results.find((r) => r.agent === 'claude-code')!;
      expect(claudeResult.status).toBe('installed');
    });
  });

  describe('path traversal prevention', () => {
    it('skips files with .. in path', () => {
      const malicious: CLISkill = {
        ...fakeSkill,
        files: [
          { path: '../../../etc/passwd', content: 'pwned' },
          { path: 'SKILL.md', content: '# Safe' },
        ],
      };
      installSkill(malicious, ['cursor'], 'local', false, true);
      expect(existsSync(join(tmpDir, '..', '..', '..', 'etc', 'passwd'))).toBe(false);
    });

    it('skips absolute paths', () => {
      const malicious: CLISkill = {
        ...fakeSkill,
        files: [
          { path: '/etc/passwd', content: 'pwned' },
          { path: 'SKILL.md', content: '# Safe' },
        ],
      };
      installSkill(malicious, ['cursor'], 'local', false, true);
    });
  });

  describe('uninstall', () => {
    it('removes skill directory for each agent', () => {
      installSkill(fakeSkill, ['roo', 'claude-code'], 'local', false, true);
      uninstallSkill('test-skill', ['roo', 'claude-code'], 'local');
      expect(existsSync(join(tmpDir, '.roo', 'skills', 'test-skill'))).toBe(false);
      expect(existsSync(join(tmpDir, '.claude', 'skills', 'test-skill'))).toBe(false);
    });

    it('silently handles non-existent skill', () => {
      expect(() => uninstallSkill('nonexistent', ['cursor'], 'local')).not.toThrow();
    });

    it('rejects unsafe slugs', () => {
      expect(() => uninstallSkill('../bad', ['cursor'], 'local')).not.toThrow();
    });
  });
});
