import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { discoverPluginSkills, hasPluginManifests } from '../lib/plugin-manifest.js';

function makeTmpDir(): string {
  const d = join(tmpdir(), `skillsauth-plugin-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(d, { recursive: true });
  return d;
}

describe('plugin-manifest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  });

  describe('hasPluginManifests', () => {
    it('returns false for empty directory', () => {
      expect(hasPluginManifests(tmpDir)).toBe(false);
    });

    it('returns true when .claude-plugin/plugin.json exists', () => {
      const dir = join(tmpDir, '.claude-plugin');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'plugin.json'), '{}');
      expect(hasPluginManifests(tmpDir)).toBe(true);
    });

    it('returns true when .cursor-plugin/plugin.json exists', () => {
      const dir = join(tmpDir, '.cursor-plugin');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'plugin.json'), '{}');
      expect(hasPluginManifests(tmpDir)).toBe(true);
    });

    it('returns true when .claude-plugin/marketplace.json exists', () => {
      const dir = join(tmpDir, '.claude-plugin');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'marketplace.json'), '{}');
      expect(hasPluginManifests(tmpDir)).toBe(true);
    });
  });

  describe('discoverPluginSkills', () => {
    it('discovers skills from .claude-plugin/plugin.json', () => {
      // Create plugin manifest
      const claudeDir = join(tmpDir, '.claude-plugin');
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(join(claudeDir, 'plugin.json'), JSON.stringify({
        name: 'test-plugin',
        skills: ['./skills/my-skill/SKILL.md'],
      }));

      // Create skill
      const skillDir = join(tmpDir, 'skills', 'my-skill');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: my-skill\n---\n# My Skill');

      const skills = discoverPluginSkills(tmpDir);
      expect(skills.length).toBeGreaterThanOrEqual(1);
      const found = skills.find((s) => s.name === 'my-skill');
      expect(found).toBeDefined();
      expect(found!.pluginName).toBe('test-plugin');
      expect(found!.source).toBe('claude-plugin');
    });

    it('discovers skills from .cursor-plugin/plugin.json with string skills dir', () => {
      const cursorDir = join(tmpDir, '.cursor-plugin');
      mkdirSync(cursorDir, { recursive: true });
      writeFileSync(join(cursorDir, 'plugin.json'), JSON.stringify({
        name: 'cursor-plugin',
        skills: 'skills/',
      }));

      const skillDir = join(tmpDir, 'skills', 'cursor-skill');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: cursor-skill\n---\n# Cursor Skill');

      const skills = discoverPluginSkills(tmpDir);
      const found = skills.find((s) => s.name === 'cursor-skill');
      expect(found).toBeDefined();
      expect(found!.pluginName).toBe('cursor-plugin');
      expect(found!.source).toBe('cursor-plugin');
    });

    it('discovers skills from marketplace.json multi-plugin catalog', () => {
      const claudeDir = join(tmpDir, '.claude-plugin');
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(join(claudeDir, 'marketplace.json'), JSON.stringify({
        plugins: [
          {
            name: 'plugin-a',
            source: './plugins/a',
            skills: ['./skills/skill-a/SKILL.md'],
          },
          {
            name: 'plugin-b',
            source: './plugins/b',
            skills: ['./skills/skill-b/SKILL.md'],
          },
        ],
      }));

      // Create skills for plugin-a
      const skillA = join(tmpDir, 'plugins', 'a', 'skills', 'skill-a');
      mkdirSync(skillA, { recursive: true });
      writeFileSync(join(skillA, 'SKILL.md'), '---\nname: skill-a\n---\n# A');

      // Create skills for plugin-b
      const skillB = join(tmpDir, 'plugins', 'b', 'skills', 'skill-b');
      mkdirSync(skillB, { recursive: true });
      writeFileSync(join(skillB, 'SKILL.md'), '---\nname: skill-b\n---\n# B');

      const skills = discoverPluginSkills(tmpDir);
      expect(skills.find((s) => s.name === 'skill-a')?.pluginName).toBe('plugin-a');
      expect(skills.find((s) => s.name === 'skill-b')?.pluginName).toBe('plugin-b');
    });

    it('discovers skills from conventional directories without manifests', () => {
      const skillDir = join(tmpDir, 'skills', 'conventional-skill');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'SKILL.md'), '# Conventional Skill');

      const skills = discoverPluginSkills(tmpDir);
      const found = skills.find((s) => s.name === 'conventional-skill');
      expect(found).toBeDefined();
      expect(found!.source).toBe('directory');
      expect(found!.pluginName).toBeUndefined();
    });

    it('deduplicates skills found via multiple sources', () => {
      // Both manifest and conventional dir point to same skill
      const cursorDir = join(tmpDir, '.cursor-plugin');
      mkdirSync(cursorDir, { recursive: true });
      writeFileSync(join(cursorDir, 'plugin.json'), JSON.stringify({
        name: 'dup-plugin',
        skills: 'skills/',
      }));

      const skillDir = join(tmpDir, 'skills', 'dup-skill');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'SKILL.md'), '# Dup Skill');

      const skills = discoverPluginSkills(tmpDir);
      const matches = skills.filter((s) => s.name === 'dup-skill');
      expect(matches).toHaveLength(1);
    });

    it('returns empty array for directory with no skills', () => {
      expect(discoverPluginSkills(tmpDir)).toHaveLength(0);
    });

    it('ignores paths with traversal attempts in manifests', () => {
      const claudeDir = join(tmpDir, '.claude-plugin');
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(join(claudeDir, 'plugin.json'), JSON.stringify({
        name: 'evil',
        skills: ['../../etc/passwd'],
      }));

      const skills = discoverPluginSkills(tmpDir);
      expect(skills).toHaveLength(0);
    });
  });
});
