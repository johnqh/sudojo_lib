/**
 * Board scrambling utilities for creating visually different but equivalent puzzles
 *
 * Re-exports scramble functions from @sudobility/sudojo_types for backwards compatibility.
 * The implementation has been moved to sudojo_types to allow sharing between frontend and backend.
 */

// Re-export scramble functions from sudojo_types
export { scrambleBoard, noScramble } from '@sudobility/sudojo_types';
