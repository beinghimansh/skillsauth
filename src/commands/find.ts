import * as p from '@clack/prompts';
import chalk from 'chalk';
import { searchSkills } from '../lib/api.js';
import { printError } from '../utils/display.js';

interface FindOptions {
  limit?: number;
  json?: boolean;
}

export async function findCommand(query: string | undefined, opts: FindOptions): Promise<void> {
  let searchQuery = query ?? '';

  if (!searchQuery) {
    const result = await p.text({
      message: 'What kind of skill are you looking for?',
      placeholder: 'e.g. "terraform", "docker", "react"',
      validate: (v) => (v.trim().length < 1 ? 'Enter a search term' : undefined),
    });
    if (p.isCancel(result)) { p.cancel('Cancelled'); return; }
    searchQuery = result as string;
  }

  const spinner = opts.json ? undefined : p.spinner();
  spinner?.start(`Searching "${chalk.cyan(searchQuery)}"...`);

  try {
    const { results, total } = await searchSkills(searchQuery, opts.limit ?? 20);
    spinner?.stop(`${total} result(s) for "${searchQuery}"`);

    if (opts.json) {
      console.log(JSON.stringify({ query: searchQuery, total, results: results.map((s) => ({
        slug: s.slug, name: s.name, description: s.description,
        repo: `${s.repoOwner}/${s.repoName}`, stars: s.stars, category: s.category,
      })) }, null, 2));
      return;
    }

    if (!results.length) {
      console.log(chalk.dim('\n  No results found. Try a broader search.\n'));
      return;
    }

    // Interactive selection
    const sel = await p.select({
      message: `Select a skill to install (${total} found):`,
      options: results.map((s) => ({
        value: `${s.repoOwner}/${s.repoName} ${s.slug}`,
        label: `${chalk.bold(s.name)}`,
        hint: `${s.repoOwner}/${s.repoName} — ${s.description.slice(0, 55)}`,
      })),
    });

    if (p.isCancel(sel)) { p.cancel('Cancelled'); return; }

    const [repoArg, ...slugParts] = (sel as string).split(' ');
    const skillSlug = slugParts.join(' ');
    console.log('');
    console.log(chalk.dim(`  Run: npx skillsauth add ${repoArg} ${skillSlug}`));
    console.log('');
  } catch (e: unknown) {
    spinner?.stop('Failed');
    printError((e as Error).message);
    process.exit(1);
  }
}
