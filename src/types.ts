export interface CLISkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  sha: string;
  repoOwner: string;
  repoName: string;
  triggerPhrase: string;
  category: string;
  stars: number;
  scanStatus: 'clean';
  scannedAt: string | null;
  files: Array<{ path: string; content: string }>;
}

export interface RepoResponse {
  repoOwner: string;
  repoName: string;
  totalSkills: number;
  skills: CLISkill[];
}

export interface SearchResponse {
  query: string;
  total: number;
  results: CLISkill[];
}

export type AgentType = 'claude-code' | 'cursor' | 'windsurf';
export type InstallScope = 'local' | 'global';

export interface InstalledSkill {
  slug: string;
  name: string;
  repoOwner: string;
  repoName: string;
  version: string;
  sha: string;
  description: string;
  installedAt: string;
  updatedAt: string;
  agents: AgentType[];
  scope: InstallScope;
  paths: Partial<Record<AgentType, string>>;
}

export interface Lockfile {
  version: number;
  generatedAt: string;
  skills: Record<string, InstalledSkill>;
}
