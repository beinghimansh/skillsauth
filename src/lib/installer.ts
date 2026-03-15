import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync, readdirSync, rmdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import type { CLISkill, AgentType, InstallScope } from '../types.js';
import { AGENT_PATHS } from '../utils/constants.js';

export interface InstallResult {
  agent: AgentType;
  path: string;
  status: 'installed' | 'updated' | 'skipped' | 'error';
  error?: string;
}

export function getInstallPath(slug: string, agent: AgentType, scope: InstallScope): string {
  return scope === 'global'
    ? AGENT_PATHS[agent].global(slug)
    : AGENT_PATHS[agent].local(slug);
}

export function installSkill(
  skill: CLISkill,
  agents: AgentType[],
  scope: InstallScope,
  force = false
): InstallResult[] {
  return agents.map((agent) => {
    const filePath = getInstallPath(skill.slug, agent, scope);
    const absPath = scope === 'local' ? join(process.cwd(), filePath) : filePath;
    
    try {
      const alreadyExists = existsSync(absPath);
      const content = skill.files[0]?.content ?? '';
      
      if (alreadyExists && !force && readFileSync(absPath, 'utf8') === content) {
        return { agent, path: filePath, status: 'skipped' as const };
      }
      
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, content, 'utf8');
      
      const status: 'installed' | 'updated' = alreadyExists ? 'updated' : 'installed';
      return { agent, path: filePath, status };
    } catch (e: unknown) {
      const error = e as Error;
      return { agent, path: filePath, status: 'error' as const, error: error.message };
    }
  });
}

export function uninstallSkill(slug: string, agents: AgentType[], scope: InstallScope): void {
  agents.forEach((agent) => {
    const p = getInstallPath(slug, agent, scope);
    const abs = scope === 'local' ? join(process.cwd(), p) : p;
    try {
      unlinkSync(abs);
    } catch {
      // File may not exist, that's fine
    }
    // Remove parent dir if it's a slug-named folder and now empty
    const dir = dirname(abs);
    if (basename(dir) === slug) {
      try {
        if (readdirSync(dir).length === 0) rmdirSync(dir);
      } catch {
        // Directory may not exist or not be empty
      }
    }
  });
}
