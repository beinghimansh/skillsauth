import { describe, it, expect } from 'vitest';
import { AGENT_IDS } from '../types.js';
import { AGENT_PATHS } from '../utils/constants.js';
import { detectAgents, getDisplayName, getAgentMeta } from '../lib/agents.js';

describe('Agent registry', () => {
  it('AGENT_IDS contains at least 35 agents', () => {
    expect(AGENT_IDS.length).toBeGreaterThanOrEqual(35);
  });

  it('every agent ID has a path definition', () => {
    for (const id of AGENT_IDS) {
      expect(AGENT_PATHS[id]).toBeDefined();
      expect(typeof AGENT_PATHS[id].local).toBe('function');
      expect(typeof AGENT_PATHS[id].global).toBe('function');
    }
  });

  it('local paths are project-relative (dot-dir or skills/)', () => {
    for (const id of AGENT_IDS) {
      const p = AGENT_PATHS[id].local('test-slug');
      expect(p.startsWith('.') || p.startsWith('skills/')).toBe(true);
    }
  });

  it('global paths are absolute (contain homedir)', () => {
    for (const id of AGENT_IDS) {
      const p = AGENT_PATHS[id].global('test-slug');
      expect(p.length).toBeGreaterThan(10);
    }
  });

  it('every agent has a display name', () => {
    for (const id of AGENT_IDS) {
      expect(getDisplayName(id).length).toBeGreaterThan(0);
    }
  });

  it('getAgentMeta returns id + dotDir + displayName', () => {
    const meta = getAgentMeta('cursor');
    expect(meta.id).toBe('cursor');
    expect(meta.dotDir).toBe('.cursor');
    expect(meta.displayName).toBe('Cursor');
  });

  it('detectAgents returns all agents', () => {
    const agents = detectAgents('local', process.cwd());
    expect(agents.length).toBe(AGENT_IDS.length);
    agents.forEach((a) => {
      expect(a.name.length).toBeGreaterThan(0);
      expect(typeof a.detected).toBe('boolean');
    });
  });
});
