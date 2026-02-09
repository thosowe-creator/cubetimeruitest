import { randomScrambleForEvent } from 'https://cdn.cubing.net/v0/js/cubing/scramble';

/**
 * Return cubing.js scramble generator for an eventId.
 * Kept as a module so the app no longer depends on window globals.
 */
export { randomScrambleForEvent };

export function getScramble(eventId) {
  return randomScrambleForEvent(eventId);
}
