import { closestActionTarget } from './dom.js';

export function bindUI(actions) {
  document.addEventListener('click', (e) => {
    const el = closestActionTarget(e.target);
    if (!el) return;

    const name = el.dataset.action;
    const fn = actions[name];
    if (typeof fn !== 'function') {
      console.warn('[bindUI] Unknown action:', name);
      return;
    }

    let args = [];
    if (el.dataset.args) {
      try {
        args = JSON.parse(el.dataset.args);
      } catch (err) {
        console.warn('[bindUI] Bad data-args JSON for', name, el.dataset.args, err);
      }
    }

    if (el.dataset.passEvent === '1') {
      fn(e, ...args);
    } else {
      fn(...args);
    }
  });
}
