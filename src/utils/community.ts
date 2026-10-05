/**
 * Community platform ordering and labels.
 *
 * Brand colors and icons stay in the apps (they are presentation); this holds
 * the order platforms are listed in and their labels.
 */

/** A known community platform. */
export interface CommunityPlatformInfo {
  /** Platform id as the API sends it in `Community.platform` */
  id: string;
  /** i18n key for the section label (default namespace) */
  labelKey: string;
  /** English label, the fallback for `labelKey` (as the web page shows it) */
  label: string;
}

/**
 * Known platforms in display order (the web CommunitiesPage's PLATFORM_ORDER).
 * Unknown platforms sort after these.
 *
 * The `communities.platforms.*` keys are not in the locale files yet; pass
 * `label` as the default value: `t(p.labelKey, p.label)`.
 */
export const COMMUNITY_PLATFORMS = [
  { id: 'reddit', labelKey: 'communities.platforms.reddit', label: 'Reddit' },
  {
    id: 'discord',
    labelKey: 'communities.platforms.discord',
    label: 'Discord',
  },
  { id: 'forum', labelKey: 'communities.platforms.forum', label: 'Forums' },
  {
    id: 'facebook',
    labelKey: 'communities.platforms.facebook',
    label: 'Facebook',
  },
  {
    id: 'telegram',
    labelKey: 'communities.platforms.telegram',
    label: 'Telegram',
  },
  {
    id: 'youtube',
    labelKey: 'communities.platforms.youtube',
    label: 'YouTube',
  },
  {
    id: 'whatsapp',
    labelKey: 'communities.platforms.whatsapp',
    label: 'WhatsApp',
  },
  {
    id: 'website',
    labelKey: 'communities.platforms.website',
    label: 'Websites',
  },
] as const satisfies readonly CommunityPlatformInfo[];

const PLATFORM_ORDER: readonly string[] = COMMUNITY_PLATFORMS.map(p => p.id);

/** Info for a platform id (case-insensitive), or undefined if unknown. */
export function getCommunityPlatform(
  platform: string
): CommunityPlatformInfo | undefined {
  const id = platform.toLowerCase();
  return COMMUNITY_PLATFORMS.find(p => p.id === id);
}

/**
 * Sort platform ids into display order: known platforms in
 * COMMUNITY_PLATFORMS order (case-insensitive), unknown ones after them in
 * their original order. Returns a new array.
 */
export function sortCommunityPlatforms(platforms: Iterable<string>): string[] {
  const rank = (platform: string): number => {
    const index = PLATFORM_ORDER.indexOf(platform.toLowerCase());
    return index === -1 ? PLATFORM_ORDER.length : index;
  };
  return [...platforms].sort((a, b) => rank(a) - rank(b));
}
