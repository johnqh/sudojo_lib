/**
 * Technique-related utilities
 */

/**
 * Convert technique title to icon filename
 *
 * @param title - Technique title (e.g., "Full House", "X-Wing")
 * @returns Icon URL path
 *
 * @example
 * getTechniqueIconUrl("Full House") // "/technique.full.house.svg"
 * getTechniqueIconUrl("X-Wing") // "/technique.x.wing.svg"
 * getTechniqueIconUrl("XY-Wing") // "/technique.xy.wing.svg"
 */
export function getTechniqueIconUrl(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/\s+/g, '.') // spaces to dots
    .replace(/-/g, '.'); // hyphens to dots
  return `/technique.${normalized}.svg`;
}

/** Map technique titles to HTML help file paths */
export const TECHNIQUE_TO_HELP_FILE: Record<string, string> = {
  'Full House': 'Full_House.html',
  'Naked Single': 'Naked_Single.html',
  'Hidden Single': 'Hidden_Single.html',
  'Naked Pair': 'Naked_Pair.html',
  'Hidden Pair': 'Hidden_Pair.html',
  'Locked Candidates': 'Locked_Candidates.html',
  'Naked Triple': 'Naked_Triple.html',
  'Hidden Triple': 'Hidden_Triple.html',
  'Naked Quad': 'Nakded_Quad.html', // Note: typo in original file name
  'Hidden Quad': 'Hidden_Quad.html',
  'X-Wing': 'X-Wing.html',
  Swordfish: 'Swordfish.html',
  Jellyfish: 'Jellyfish.html',
  Squirmbag: 'Squirmbag.html',
  'XY-Wing': 'XY-Wing.html',
  'XYZ-Wing': 'XYZ-Wing.html',
  'WXYZ-Wing': 'WXYZ-Wing.html',
  'Finned X-Wing': 'Finned_X-Wing.html',
  'Finned Swordfish': 'Finned_Swordfish.html',
  'Finned Jellyfish': 'Finned_Jellyfish.html',
  'Finned Squirmbag': 'Finned_Squirmbag.html',
  'Almost Locked Sets': 'Almost_Locked_Sets.html',
  'ALS Chain': 'ALS-Chain.html',
  'ALS-Chain': 'ALS-Chain.html',
};

/** Reverse mapping: HTML file name (lowercase) -> technique title */
export const HELP_FILE_TO_TECHNIQUE: Record<string, string> = Object.entries(
  TECHNIQUE_TO_HELP_FILE
).reduce(
  (acc, [title, file]) => {
    acc[file.toLowerCase()] = title;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Get help file URL for a technique
 *
 * @param techniqueTitle - Technique title
 * @returns Help file URL path or generated path if not in mapping
 */
export function getHelpFileUrl(techniqueTitle: string): string {
  const fileName = TECHNIQUE_TO_HELP_FILE[techniqueTitle];
  if (fileName) {
    return `/help/${fileName}`;
  }
  // Try to generate file name from title (spaces to underscores, preserve hyphens)
  const generatedFileName = `${techniqueTitle.replace(/\s+/g, '_')}.html`;
  return `/help/${generatedFileName}`;
}

/**
 * Get technique title from help file name
 *
 * @param fileName - Help file name (e.g., "Full_House.html")
 * @returns Technique title or undefined if not found
 */
export function getTechniqueFromHelpFile(fileName: string): string | undefined {
  return HELP_FILE_TO_TECHNIQUE[fileName.toLowerCase()];
}

/**
 * Extract body content from HTML and clean up navigation links
 *
 * @param html - Raw HTML string
 * @returns Cleaned HTML body content
 */
export function extractBodyContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove "Back to Course Catalog" links
  const links = doc.querySelectorAll('a[href="index.html"]');
  links.forEach(link => {
    const parent =
      link.closest('tr') ?? link.closest('td') ?? link.parentElement;
    if (parent) {
      parent.remove();
    }
  });

  // Fix image paths - convert relative paths to absolute /help/ paths
  const images = doc.querySelectorAll('img');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('/') && !src.startsWith('http')) {
      img.setAttribute('src', `/help/${src}`);
    }
  });

  // Get the body content
  return doc.body.innerHTML;
}
