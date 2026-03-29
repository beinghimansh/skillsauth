import type { AgentType } from '../types.js';
import { AGENT_IDS, AGENT_REGISTRY, isAgentDetected } from './agent-registry.js';

export interface AgentMeta {
  id: AgentType;
  displayName: string;
  dotDir: string;
}

export function getAgentMeta(id: AgentType): AgentMeta {
  const e = AGENT_REGISTRY[id];
  return { id, displayName: e.displayName, dotDir: e.metaDotDir };
}

export function getDisplayName(id: AgentType): string {
  return AGENT_REGISTRY[id].displayName;
}

export interface AgentDetection {
  id: AgentType;
  name: string;
  detected: boolean;
}

export function detectAgents(_scope: 'local' | 'global', _cwd: string): AgentDetection[] {
  return AGENT_IDS.map((id) => ({
    id,
    name: AGENT_REGISTRY[id].displayName,
    detected: isAgentDetected(id),
  }));
}

export function detectAutoAgents(scope: 'local' | 'global', cwd: string): AgentType[] {
  return detectAgents(scope, cwd)
    .filter((a) => a.detected)
    .map((a) => a.id);
}
