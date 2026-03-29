import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve, normalize, sep } from 'path';

/**
 * Prevent path traversal: ensure target is within basePath.
 */
function isContainedIn(targetPath: string, basePath: string): boolean {
  const normalizedBase = normalize(resolve(basePath));
  const normalizedTarget = normalize(resolve(targetPath));
  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}

function isValidRelativePath(path: string): boolean {
  return path.startsWith('./');
}

// ---------- Claude Code manifests ----------

interface ClaudePluginEntry {
  source?: string | { source: string; repo?: string };
  skills?: string[];
  name?: string;
  description?: string;
}

interface ClaudeMarketplaceManifest {
  metadata?: { pluginRoot?: string };
  plugins?: ClaudePluginEntry[];
}

interface ClaudePluginManifest {
  name?: string;
  skills?: string[];
}

// ---------- Cursor manifest ----------

interface CursorPluginManifest {
  name?: string;
  description?: string;
  skills?: string | string[];
}

// ---------- Discovered skill ----------

export interface DiscoveredSkill {
  name: string;
  path: string;
  pluginName?: string;
  source: 'claude-plugin' | 'cursor-plugin' | 'directory';
}

/**
 * Discover SKILL.md files from plugin manifests and conventional directories
 * within a local path. This supports:
 *
 * 1. `.claude-plugin/marketplace.json` (multi-plugin catalog)
 * 2. `.claude-plugin/plugin.json` (single plugin)
 * 3. `.cursor-plugin/plugin.json` (Cursor plugin)
 * 4. Direct SKILL.md discovery in `skills/`, `.agents/skills/`, etc.
 */
export function discoverPluginSkills(basePath: string): DiscoveredSkill[] {
  const absBase = resolve(basePath);
  const skills: DiscoveredSkill[] = [];
  const seen = new Set<string>();

  function addSkill(skillDir: string, pluginName: string | undefined, source: DiscoveredSkill['source']): void {
    const skillMd = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMd)) return;
    const normalizedDir = normalize(resolve(skillDir));
    if (seen.has(normalizedDir)) return;
    seen.add(normalizedDir);

    const name = dirname(skillMd).split(sep).pop() ?? 'unknown';
    skills.push({ name, path: normalizedDir, pluginName, source });
  }

  // 1. Claude Code marketplace.json
  try {
    const content = readFileSync(join(absBase, '.claude-plugin', 'marketplace.json'), 'utf-8');
    const manifest: ClaudeMarketplaceManifest = JSON.parse(content);
    const pluginRoot = manifest.metadata?.pluginRoot;
    const validPluginRoot = pluginRoot === undefined || isValidRelativePath(pluginRoot);

    if (validPluginRoot) {
      for (const plugin of manifest.plugins ?? []) {
        if (typeof plugin.source !== 'string' && plugin.source !== undefined) continue;
        if (plugin.source !== undefined && !isValidRelativePath(plugin.source)) continue;

        const pluginBase = join(absBase, pluginRoot ?? '', plugin.source ?? '');
        if (!isContainedIn(pluginBase, absBase)) continue;

        if (plugin.skills?.length) {
          for (const sp of plugin.skills) {
            if (!isValidRelativePath(sp)) continue;
            const skillDir = dirname(join(pluginBase, sp));
            if (isContainedIn(skillDir, absBase)) {
              addSkill(skillDir, plugin.name, 'claude-plugin');
            }
          }
        }
        // Also scan skills/ subdirectory
        scanSkillsDir(join(pluginBase, 'skills'), plugin.name, 'claude-plugin');
      }
    }
  } catch { /* no marketplace.json */ }

  // 2. Claude Code plugin.json
  try {
    const content = readFileSync(join(absBase, '.claude-plugin', 'plugin.json'), 'utf-8');
    const manifest: ClaudePluginManifest = JSON.parse(content);
    if (manifest.skills?.length) {
      for (const sp of manifest.skills) {
        if (!isValidRelativePath(sp)) continue;
        const skillDir = dirname(join(absBase, sp));
        if (isContainedIn(skillDir, absBase)) {
          addSkill(skillDir, manifest.name, 'claude-plugin');
        }
      }
    }
    scanSkillsDir(join(absBase, 'skills'), manifest.name, 'claude-plugin');
  } catch { /* no plugin.json */ }

  // 3. Cursor plugin.json
  try {
    const content = readFileSync(join(absBase, '.cursor-plugin', 'plugin.json'), 'utf-8');
    const manifest: CursorPluginManifest = JSON.parse(content);

    if (typeof manifest.skills === 'string') {
      // Directory reference like "skills/"
      scanSkillsDir(join(absBase, manifest.skills), manifest.name, 'cursor-plugin');
    } else if (Array.isArray(manifest.skills)) {
      for (const sp of manifest.skills) {
        const skillDir = dirname(join(absBase, sp));
        if (isContainedIn(skillDir, absBase)) {
          addSkill(skillDir, manifest.name, 'cursor-plugin');
        }
      }
    } else {
      scanSkillsDir(join(absBase, 'skills'), manifest.name, 'cursor-plugin');
    }
  } catch { /* no cursor plugin.json */ }

  // 4. Conventional directory scan (no manifests needed)
  const conventionalDirs = [
    'skills',
    '.agents/skills',
    '.claude/skills',
    '.cursor/skills',
  ];
  for (const dir of conventionalDirs) {
    scanSkillsDir(join(absBase, dir), undefined, 'directory');
  }

  function scanSkillsDir(dir: string, pluginName: string | undefined, source: DiscoveredSkill['source']): void {
    if (!existsSync(dir)) return;
    if (!isContainedIn(dir, absBase)) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillDir = join(dir, entry.name);
        addSkill(skillDir, pluginName, source);
      }
    } catch { /* permission error or not a directory */ }
  }

  return skills;
}

/**
 * Check whether a local path looks like it has plugin manifests or skill directories.
 */
export function hasPluginManifests(basePath: string): boolean {
  const abs = resolve(basePath);
  return (
    existsSync(join(abs, '.claude-plugin', 'marketplace.json')) ||
    existsSync(join(abs, '.claude-plugin', 'plugin.json')) ||
    existsSync(join(abs, '.cursor-plugin', 'plugin.json'))
  );
}
