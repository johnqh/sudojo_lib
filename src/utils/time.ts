/**
 * Time formatting utilities
 */

/**
 * Format seconds into MM:SS or HH:MM:SS string
 *
 * @param seconds - Total seconds to format
 * @returns Formatted time string
 *
 * @example
 * formatTime(65) // "1:05"
 * formatTime(3665) // "1:01:05"
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse a time string back to seconds
 *
 * @param timeString - Time string in MM:SS or HH:MM:SS format
 * @returns Total seconds
 */
export function parseTime(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 2) {
    const [minutes, secs] = parts;
    return (minutes ?? 0) * 60 + (secs ?? 0);
  }
  if (parts.length === 3) {
    const [hours, minutes, secs] = parts;
    return (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (secs ?? 0);
  }
  return 0;
}
