/**
 * Agent IDs, install paths, and detection aligned
 * with SkillsAuth platform.
 */
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface AgentPathDef {
  local: (slug: string) => string;
  global: (slug: string) => string;
}

const home = homedir();

function configHome(): string {
  return process.env['XDG_CONFIG_HOME']?.trim() || join(home, '.config');
}

function claudeHome(): string {
  return process.env['CLAUDE_CONFIG_DIR']?.trim() || join(home, '.claude');
}

function codexHome(): string {
  return process.env['CODEX_HOME']?.trim() || join(home, '.codex');
}

function getOpenClawGlobalSkillsDir(): string {
  if (existsSync(join(home, '.openclaw'))) return join(home, '.openclaw/skills');
  if (existsSync(join(home, '.clawdbot'))) return join(home, '.clawdbot/skills');
  if (existsSync(join(home, '.moltbot'))) return join(home, '.moltbot/skills');
  return join(home, '.openclaw/skills');
}

interface AgentEntry {
  displayName: string;
  skillsDirRel: string;
  globalSkillsRoot: () => string;
  metaDotDir: string;
  detect: () => boolean;
}

const cfg = configHome();
const ch = () => claudeHome();
const cx = () => codexHome();

/** Sorted; must match every key in `AGENT_REGISTRY`. */
export const AGENT_IDS = [
  'adal',
  'amp',
  'antigravity',
  'augment',
  'claude-code',
  'cline',
  'codebuddy',
  'codex',
  'command-code',
  'continue',
  'cortex',
  'crush',
  'cursor',
  'deepagents',
  'droid',
  'firebender',
  'gemini-cli',
  'github-copilot',
  'goose',
  'iflow-cli',
  'junie',
  'kilo',
  'kimi-cli',
  'kiro-cli',
  'kode',
  'mcpjam',
  'mistral-vibe',
  'mux',
  'neovate',
  'opencode',
  'openclaw',
  'openhands',
  'pi',
  'pochi',
  'qoder',
  'qwen-code',
  'replit',
  'roo',
  'trae',
  'trae-cn',
  'universal',
  'warp',
  'windsurf',
  'zencoder',
] as const;

export type AgentType = (typeof AGENT_IDS)[number];

export const AGENT_REGISTRY: Record<AgentType, AgentEntry> = {
  adal: {
    displayName: 'AdaL',
    skillsDirRel: '.adal/skills',
    globalSkillsRoot: () => join(home, '.adal/skills'),
    metaDotDir: '.adal',
    detect: () => existsSync(join(home, '.adal')),
  },
  amp: {
    displayName: 'Amp',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(cfg, 'agents/skills'),
    metaDotDir: '.config',
    detect: () => existsSync(join(cfg, 'amp')),
  },
  antigravity: {
    displayName: 'Antigravity',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.gemini/antigravity/skills'),
    metaDotDir: '.gemini',
    detect: () => existsSync(join(home, '.gemini/antigravity')),
  },
  augment: {
    displayName: 'Augment',
    skillsDirRel: '.augment/skills',
    globalSkillsRoot: () => join(home, '.augment/skills'),
    metaDotDir: '.augment',
    detect: () => existsSync(join(home, '.augment')),
  },
  'claude-code': {
    displayName: 'Claude Code',
    skillsDirRel: '.claude/skills',
    globalSkillsRoot: () => join(ch(), 'skills'),
    metaDotDir: '.claude',
    detect: () => existsSync(ch()),
  },
  cline: {
    displayName: 'Cline',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.agents/skills'),
    metaDotDir: '.cline',
    detect: () => existsSync(join(home, '.cline')),
  },
  codebuddy: {
    displayName: 'CodeBuddy',
    skillsDirRel: '.codebuddy/skills',
    globalSkillsRoot: () => join(home, '.codebuddy/skills'),
    metaDotDir: '.codebuddy',
    detect: () =>
      existsSync(join(process.cwd(), '.codebuddy')) || existsSync(join(home, '.codebuddy')),
  },
  codex: {
    displayName: 'Codex',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(cx(), 'skills'),
    metaDotDir: '.codex',
    detect: () => existsSync(cx()) || existsSync('/etc/codex'),
  },
  'command-code': {
    displayName: 'Command Code',
    skillsDirRel: '.commandcode/skills',
    globalSkillsRoot: () => join(home, '.commandcode/skills'),
    metaDotDir: '.commandcode',
    detect: () => existsSync(join(home, '.commandcode')),
  },
  continue: {
    displayName: 'Continue',
    skillsDirRel: '.continue/skills',
    globalSkillsRoot: () => join(home, '.continue/skills'),
    metaDotDir: '.continue',
    detect: () =>
      existsSync(join(process.cwd(), '.continue')) || existsSync(join(home, '.continue')),
  },
  cortex: {
    displayName: 'Cortex Code',
    skillsDirRel: '.cortex/skills',
    globalSkillsRoot: () => join(home, '.snowflake/cortex/skills'),
    metaDotDir: '.snowflake',
    detect: () => existsSync(join(home, '.snowflake/cortex')),
  },
  crush: {
    displayName: 'Crush',
    skillsDirRel: '.crush/skills',
    globalSkillsRoot: () => join(home, '.config/crush/skills'),
    metaDotDir: '.config',
    detect: () => existsSync(join(home, '.config/crush')),
  },
  cursor: {
    displayName: 'Cursor',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.cursor/skills'),
    metaDotDir: '.cursor',
    detect: () => existsSync(join(home, '.cursor')),
  },
  deepagents: {
    displayName: 'Deep Agents',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.deepagents/agent/skills'),
    metaDotDir: '.deepagents',
    detect: () => existsSync(join(home, '.deepagents')),
  },
  droid: {
    displayName: 'Droid',
    skillsDirRel: '.factory/skills',
    globalSkillsRoot: () => join(home, '.factory/skills'),
    metaDotDir: '.factory',
    detect: () => existsSync(join(home, '.factory')),
  },
  firebender: {
    displayName: 'Firebender',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.firebender/skills'),
    metaDotDir: '.firebender',
    detect: () => existsSync(join(home, '.firebender')),
  },
  'gemini-cli': {
    displayName: 'Gemini CLI',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.gemini/skills'),
    metaDotDir: '.gemini',
    detect: () => existsSync(join(home, '.gemini')),
  },
  'github-copilot': {
    displayName: 'GitHub Copilot',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.copilot/skills'),
    metaDotDir: '.copilot',
    detect: () => existsSync(join(home, '.copilot')),
  },
  goose: {
    displayName: 'Goose',
    skillsDirRel: '.goose/skills',
    globalSkillsRoot: () => join(cfg, 'goose/skills'),
    metaDotDir: '.goose',
    detect: () => existsSync(join(cfg, 'goose')),
  },
  'iflow-cli': {
    displayName: 'iFlow CLI',
    skillsDirRel: '.iflow/skills',
    globalSkillsRoot: () => join(home, '.iflow/skills'),
    metaDotDir: '.iflow',
    detect: () => existsSync(join(home, '.iflow')),
  },
  junie: {
    displayName: 'Junie',
    skillsDirRel: '.junie/skills',
    globalSkillsRoot: () => join(home, '.junie/skills'),
    metaDotDir: '.junie',
    detect: () => existsSync(join(home, '.junie')),
  },
  kilo: {
    displayName: 'Kilo Code',
    skillsDirRel: '.kilocode/skills',
    globalSkillsRoot: () => join(home, '.kilocode/skills'),
    metaDotDir: '.kilocode',
    detect: () => existsSync(join(home, '.kilocode')),
  },
  'kimi-cli': {
    displayName: 'Kimi Code CLI',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.config/agents/skills'),
    metaDotDir: '.kimi',
    detect: () => existsSync(join(home, '.kimi')),
  },
  'kiro-cli': {
    displayName: 'Kiro CLI',
    skillsDirRel: '.kiro/skills',
    globalSkillsRoot: () => join(home, '.kiro/skills'),
    metaDotDir: '.kiro',
    detect: () => existsSync(join(home, '.kiro')),
  },
  kode: {
    displayName: 'Kode',
    skillsDirRel: '.kode/skills',
    globalSkillsRoot: () => join(home, '.kode/skills'),
    metaDotDir: '.kode',
    detect: () => existsSync(join(home, '.kode')),
  },
  mcpjam: {
    displayName: 'MCPJam',
    skillsDirRel: '.mcpjam/skills',
    globalSkillsRoot: () => join(home, '.mcpjam/skills'),
    metaDotDir: '.mcpjam',
    detect: () => existsSync(join(home, '.mcpjam')),
  },
  'mistral-vibe': {
    displayName: 'Mistral Vibe',
    skillsDirRel: '.vibe/skills',
    globalSkillsRoot: () => join(home, '.vibe/skills'),
    metaDotDir: '.vibe',
    detect: () => existsSync(join(home, '.vibe')),
  },
  mux: {
    displayName: 'Mux',
    skillsDirRel: '.mux/skills',
    globalSkillsRoot: () => join(home, '.mux/skills'),
    metaDotDir: '.mux',
    detect: () => existsSync(join(home, '.mux')),
  },
  neovate: {
    displayName: 'Neovate',
    skillsDirRel: '.neovate/skills',
    globalSkillsRoot: () => join(home, '.neovate/skills'),
    metaDotDir: '.neovate',
    detect: () => existsSync(join(home, '.neovate')),
  },
  opencode: {
    displayName: 'OpenCode',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(cfg, 'opencode/skills'),
    metaDotDir: '.config',
    detect: () => existsSync(join(cfg, 'opencode')),
  },
  openclaw: {
    displayName: 'OpenClaw',
    skillsDirRel: 'skills',
    globalSkillsRoot: () => getOpenClawGlobalSkillsDir(),
    metaDotDir: '.openclaw',
    detect: () =>
      existsSync(join(home, '.openclaw')) ||
      existsSync(join(home, '.clawdbot')) ||
      existsSync(join(home, '.moltbot')),
  },
  openhands: {
    displayName: 'OpenHands',
    skillsDirRel: '.openhands/skills',
    globalSkillsRoot: () => join(home, '.openhands/skills'),
    metaDotDir: '.openhands',
    detect: () => existsSync(join(home, '.openhands')),
  },
  pi: {
    displayName: 'Pi',
    skillsDirRel: '.pi/skills',
    globalSkillsRoot: () => join(home, '.pi/agent/skills'),
    metaDotDir: '.pi',
    detect: () => existsSync(join(home, '.pi/agent')),
  },
  pochi: {
    displayName: 'Pochi',
    skillsDirRel: '.pochi/skills',
    globalSkillsRoot: () => join(home, '.pochi/skills'),
    metaDotDir: '.pochi',
    detect: () => existsSync(join(home, '.pochi')),
  },
  qoder: {
    displayName: 'Qoder',
    skillsDirRel: '.qoder/skills',
    globalSkillsRoot: () => join(home, '.qoder/skills'),
    metaDotDir: '.qoder',
    detect: () => existsSync(join(home, '.qoder')),
  },
  'qwen-code': {
    displayName: 'Qwen Code',
    skillsDirRel: '.qwen/skills',
    globalSkillsRoot: () => join(home, '.qwen/skills'),
    metaDotDir: '.qwen',
    detect: () => existsSync(join(home, '.qwen')),
  },
  replit: {
    displayName: 'Replit',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(cfg, 'agents/skills'),
    metaDotDir: '.replit',
    detect: () => existsSync(join(process.cwd(), '.replit')),
  },
  roo: {
    displayName: 'Roo Code',
    skillsDirRel: '.roo/skills',
    globalSkillsRoot: () => join(home, '.roo/skills'),
    metaDotDir: '.roo',
    detect: () => existsSync(join(home, '.roo')),
  },
  trae: {
    displayName: 'Trae',
    skillsDirRel: '.trae/skills',
    globalSkillsRoot: () => join(home, '.trae/skills'),
    metaDotDir: '.trae',
    detect: () => existsSync(join(home, '.trae')),
  },
  'trae-cn': {
    displayName: 'Trae CN',
    skillsDirRel: '.trae/skills',
    globalSkillsRoot: () => join(home, '.trae-cn/skills'),
    metaDotDir: '.trae-cn',
    detect: () => existsSync(join(home, '.trae-cn')),
  },
  universal: {
    displayName: 'Universal',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(cfg, 'agents/skills'),
    metaDotDir: '.agents',
    detect: () => false,
  },
  warp: {
    displayName: 'Warp',
    skillsDirRel: '.agents/skills',
    globalSkillsRoot: () => join(home, '.agents/skills'),
    metaDotDir: '.warp',
    detect: () => existsSync(join(home, '.warp')),
  },
  windsurf: {
    displayName: 'Windsurf',
    skillsDirRel: '.windsurf/skills',
    globalSkillsRoot: () => join(home, '.codeium/windsurf/skills'),
    metaDotDir: '.codeium',
    detect: () => existsSync(join(home, '.codeium/windsurf')),
  },
  zencoder: {
    displayName: 'Zencoder',
    skillsDirRel: '.zencoder/skills',
    globalSkillsRoot: () => join(home, '.zencoder/skills'),
    metaDotDir: '.zencoder',
    detect: () => existsSync(join(home, '.zencoder')),
  },
};

function skillMdRel(skillsDirRel: string, slug: string): string {
  const base = skillsDirRel.replace(/\/$/, '');
  return `${base}/${slug}/SKILL.md`;
}

function buildAgentPaths(): Record<AgentType, AgentPathDef> {
  const o = {} as Record<AgentType, AgentPathDef>;
  for (const id of AGENT_IDS) {
    const e = AGENT_REGISTRY[id];
    o[id] = {
      local: (slug: string) => skillMdRel(e.skillsDirRel, slug),
      global: (slug: string) => join(e.globalSkillsRoot(), slug, 'SKILL.md'),
    };
  }
  return o;
}

export const AGENT_PATHS = buildAgentPaths();

export function isAgentDetected(id: AgentType): boolean {
  return AGENT_REGISTRY[id].detect();
}
