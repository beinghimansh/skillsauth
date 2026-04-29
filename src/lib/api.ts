import { API_BASE_URL, DEBUG, NO_ANALYTICS } from '../utils/constants.js';
import type { CLISkill, RepoResponse, SearchResponse } from '../types.js';

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  if (DEBUG) console.error(`[debug] GET ${url}`);
  
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'skillsauth-cli/3.0.1' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e: unknown) {
    const error = e as Error;
    if (error.name === 'TimeoutError') {
      throw new Error(`Request timed out (${API_BASE_URL}). Is the server running?`);
    }
    const hint = !process.env['SKILLSAUTH_API_URL']
      ? `\n  Hint: set SKILLSAUTH_API_URL to point to your SkillsAuth instance.`
      : '';
    throw new Error(`Cannot reach SkillsAuth API at ${API_BASE_URL}: ${error.message}${hint}`);
  }
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: string }).error ?? `HTTP ${res.status}`;
    if (res.status === 404 && !DEBUG) {
      throw new APIError(res.status, `${msg} — ${url}`);
    }
    throw new APIError(res.status, msg);
  }
  
  return res.json() as Promise<T>;
}

export async function fetchRepo(owner: string, repo: string): Promise<RepoResponse> {
  return apiFetch<RepoResponse>(`/repo/${owner}/${repo}`);
}

export async function fetchSkill(owner: string, repo: string, slug: string): Promise<CLISkill> {
  return apiFetch<CLISkill>(`/repo/${owner}/${repo}/${slug}`);
}

export async function searchSkills(query: string, limit = 10): Promise<SearchResponse> {
  return apiFetch<SearchResponse>(`/search?${new URLSearchParams({ q: query, limit: String(limit) })}`);
}

export interface ManifestResponse {
  fqn: string;
  version: string;
  bundle: string;
  manifestDigest: string | null;
  manifestSignedAt: string | null;
  rekorLogIndex: number | null;
}

export interface CRLResponse {
  version: number;
  revokedDigests: string[];
  issuedAt: string;
}

let crlCache: CRLResponse | null = null;

export async function fetchManifest(slug: string): Promise<ManifestResponse | null> {
  // API_BASE_URL = https://skillsauth.com/api/cli — strip the /api/cli suffix for the manifest endpoint
  const origin = API_BASE_URL.replace(/\/api\/cli\/?$/, '');
  const url = `${origin}/api/skills/${slug}/manifest`;
  if (DEBUG) console.error(`[debug] GET ${url}`);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'skillsauth-cli/3.0.1' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404 || res.status === 409) return null;
    if (!res.ok) return null;
    return res.json() as Promise<ManifestResponse>;
  } catch {
    return null;
  }
}

export async function fetchCRL(): Promise<CRLResponse | null> {
  if (crlCache) return crlCache;

  const origin = API_BASE_URL.replace(/\/api\/cli\/?$/, '');
  const url = `${origin}/api/crl`;
  if (DEBUG) console.error(`[debug] GET ${url}`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'skillsauth-cli/3.0.1' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    crlCache = (await res.json()) as CRLResponse;
    return crlCache;
  } catch {
    return null;
  }
}

export function recordDownload(skillId: string, agentType: string): void {
  if (NO_ANALYTICS) return;
  fetch(`${API_BASE_URL}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'skillsauth-cli/3.0.1' },
    body: JSON.stringify({ skillId, agentType }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

