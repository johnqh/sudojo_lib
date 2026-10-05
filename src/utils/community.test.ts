/**
 * Tests for community utilities
 */

import { describe, expect, it } from 'vitest';
import { getCommunityPlatform, sortCommunityPlatforms } from './community';

describe('sortCommunityPlatforms', () => {
  it('orders known platforms and puts unknown ones last, stably', () => {
    expect(
      sortCommunityPlatforms([
        'website',
        'mastodon',
        'Reddit',
        'forum',
        'blog',
        'discord',
      ])
    ).toEqual(['Reddit', 'discord', 'forum', 'website', 'mastodon', 'blog']);
  });

  it('accepts any iterable, e.g. Map keys', () => {
    const map = new Map([
      ['youtube', 1],
      ['telegram', 2],
    ]);
    expect(sortCommunityPlatforms(map.keys())).toEqual(['telegram', 'youtube']);
  });
});

describe('getCommunityPlatform', () => {
  it('looks up platforms case-insensitively', () => {
    expect(getCommunityPlatform('Forum')).toEqual({
      id: 'forum',
      labelKey: 'communities.platforms.forum',
      label: 'Forums',
    });
    expect(getCommunityPlatform('blog')).toBeUndefined();
  });
});
