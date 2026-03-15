import { homedir } from 'os';
import { join } from 'path';

// Production default: https://skillsauth.com/api/cli; override with SKILLSAI_API_URL (e.g. http://localhost:3000/api/cli for dev).
export const API_BASE_URL = process.env['SKILLSAI_API_URL'] ?? 'https://skillsauth.com/api/cli';
export const SKIP_PROMPTS = process.env['SKILLSAI_YES'] === 'true';
export const NO_ANALYTICS = process.env['SKILLSAI_NO_ANALYTICS'] === 'true';
export const DEBUG = process.env['SKILLSAI_DEBUG'] === 'true';
export const HOME_DIR = homedir();
export const GLOBAL_DIR = join(HOME_DIR, '.skillsai');
export const GLOBAL_LOCK = join(GLOBAL_DIR, 'lock.json');
export const LOCAL_LOCK = '.skillsai-lock.json';
export const LOCKFILE_VERSION = 1;

export const AGENT_PATHS = {
  'claude-code': {
    local: (slug: string) => `.claude/skills/${slug}/SKILL.md`,
    global: (slug: string) => join(HOME_DIR, `.claude/skills/${slug}/SKILL.md`),
  },
  'cursor': {
    local: (slug: string) => `.cursor/skills/${slug}/SKILL.md`,
    global: (slug: string) => join(HOME_DIR, `.cursor/skills/${slug}/SKILL.md`),
  },
  'windsurf': {
    local: (slug: string) => `.windsurf/memories/${slug}.md`,
    global: (slug: string) => join(HOME_DIR, `.windsurf/memories/${slug}.md`),
  },
} as const;
