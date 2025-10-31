// src/apps/appRegistry.js
// super small registry so scenes can say: app: { id: 'kanban' }

export const appRegistry = {
  // example micro-apps you likely have under src/apps
  kanban: {
    id: 'kanban',
    label: 'Task Planner',
    mount: () => {
      const el = document.querySelector('[data-app-panel="tasks"]');
      if (el) el.style.display = 'block';
    },
    unmount: () => {
      const el = document.querySelector('[data-app-panel="tasks"]');
      if (el) el.style.display = 'none';
    },
  },
  deployments: {
    id: 'deployments',
    label: 'Deploy Timeline',
    mount: () => {
      const el = document.querySelector('[data-app-panel="deployments"]');
      if (el) el.style.display = 'block';
    },
    unmount: () => {
      const el = document.querySelector('[data-app-panel="deployments"]');
      if (el) el.style.display = 'none';
    },
  },
  sound: {
    id: 'sound',
    label: 'Soundscapes',
    mount: () => {
      const el = document.querySelector('[data-app-panel="sound"]');
      if (el) el.style.display = 'block';
    },
    unmount: () => {
      const el = document.querySelector('[data-app-panel="sound"]');
      if (el) el.style.display = 'none';
    },
  },
};

export async function activateAppById(id, params = {}) {
  const app = appRegistry[id];
  if (!app) throw new Error(`App "${id}" not found in registry`);
  if (typeof app.mount === 'function') {
    await app.mount(params);
  }
}

export function deactivateAllApps() {
  Object.values(appRegistry).forEach((app) => {
    if (typeof app.unmount === 'function') {
      app.unmount();
    }
  });
}
