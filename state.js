/**
 * Simple app-wide state helper (not yet wired through all legacy code).
 * Kept here to match the modular structure and enable future cleanup.
 */
const listeners = new Set();
export const state = {};

export function getState() { return state; }

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
