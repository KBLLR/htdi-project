export function initTasksAction(manager, { buttonId, ...params }) {
  manager.registerAction(buttonId, () => {
    console.log('Tasks Action triggered!', params);
    // TODO: Implement actual tasks action logic here
  });
}
