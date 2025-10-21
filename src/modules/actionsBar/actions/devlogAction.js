import { enableOverlay } from '@modules/devlog.js';

export function initDevlogAction(manager, { buttonId, ...params }) {
  const toggleDevlog = enableOverlay();
  manager.registerAction(buttonId, () => {
    toggleDevlog();
    console.log('DevLog Action triggered!', params);
  });
}
