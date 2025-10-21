export function initConsoleAction(manager, { buttonId, ...params }) {
  manager.registerAction(buttonId, () => {
    console.log('Console Log Action triggered!', params);
    // TODO: Implement actual console log action logic here
  });
}
