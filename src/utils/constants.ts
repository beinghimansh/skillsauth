import { homedir } from 'os';
import { join } from 'path';

export { AGENT_PATHS } from '../lib/agent-registry.js';

export const API_BASE_URL = process.env['SKILLSAUTH_API_URL'] ?? 'https://skillsauth.com/api/cli';
export const SKIP_PROMPTS = process.env['SKILLSAUTH_YES'] === 'true';
export const NO_ANALYTICS = process.env['SKILLSAUTH_NO_ANALYTICS'] === 'true';
export const DEBUG = process.env['SKILLSAUTH_DEBUG'] === 'true';
export const HOME_DIR = homedir();
export const GLOBAL_DIR = join(HOME_DIR, '.skillsauth');
export const GLOBAL_LOCK = join(GLOBAL_DIR, 'lock.json');
export const LOCAL_LOCK = '.skillsauth-lock.json';
export const LOCKFILE_VERSION = 1;
