export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function on(el, evt, fn, opts) {
  if (!el) return;
  el.addEventListener(evt, fn, opts);
}

export function closestActionTarget(target) {
  return target?.closest?.('[data-action]') || null;
}
