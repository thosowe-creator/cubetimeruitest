import { initApp, actions } from './src/actions.js';
import { bindUI } from './src/bindings.js';

// Boot
bindUI(actions);
initApp();
