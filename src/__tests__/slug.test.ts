import { describe, it, expect } from 'vitest';
import { isSafeSkillSlug } from '../utils/slug.js';

describe('isSafeSkillSlug', () => {
  it('accepts valid slugs', () => {
    expect(isSafeSkillSlug('my-skill')).toBe(true);
    expect(isSafeSkillSlug('a')).toBe(true);
    expect(isSafeSkillSlug('abc-def-ghi')).toBe(true);
    expect(isSafeSkillSlug('skill123')).toBe(true);
    expect(isSafeSkillSlug('huggingface-skills-gradio')).toBe(true);
  });

  it('rejects path traversal attempts', () => {
    expect(isSafeSkillSlug('../etc/passwd')).toBe(false);
    expect(isSafeSkillSlug('../../root')).toBe(false);
    expect(isSafeSkillSlug('..')).toBe(false);
  });

  it('rejects empty and whitespace', () => {
    expect(isSafeSkillSlug('')).toBe(false);
    expect(isSafeSkillSlug(' ')).toBe(false);
    expect(isSafeSkillSlug('  ')).toBe(false);
  });

  it('rejects slugs with special characters', () => {
    expect(isSafeSkillSlug('my_skill')).toBe(false);
    expect(isSafeSkillSlug('My-Skill')).toBe(false);
    expect(isSafeSkillSlug('/absolute')).toBe(false);
    expect(isSafeSkillSlug('a/b')).toBe(false);
    expect(isSafeSkillSlug('skill@latest')).toBe(false);
  });

  it('rejects leading/trailing hyphens', () => {
    expect(isSafeSkillSlug('-leading')).toBe(false);
    expect(isSafeSkillSlug('trailing-')).toBe(false);
    expect(isSafeSkillSlug('-both-')).toBe(false);
  });
});
