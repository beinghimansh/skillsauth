import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { AgentType } from '../types.js';

export interface AgentDetection {
  id: AgentType;
  name: string;
  detected: boolean;
}

export function detectAgents(scope: 'local' | 'global', cwd: string): AgentDetection[] {
  const base = scope === 'local' ? cwd : homedir();
  return [
    { id: 'claude-code', name: 'Claude Code', detected: existsSync(join(base, '.claude')) },
    { id: 'cursor', name: 'Cursor', detected: existsSync(join(base, '.cursor')) },
    { id: 'windsurf', name: 'Windsurf', detected: existsSync(join(base, '.windsurf')) },
  ];
}
