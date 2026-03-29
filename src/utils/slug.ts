/** Slugs from the API use lowercase letters, digits, and hyphens only. */
export const SKILL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSafeSkillSlug(slug: string): boolean {
  return SKILL_SLUG_PATTERN.test(slug);
}
