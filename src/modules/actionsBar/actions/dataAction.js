export function initDataAction(manager, { buttonId, ...params }) {
  manager.registerAction(buttonId, () => {
    console.log('Data Action triggered!', params);
    // TODO: Implement actual data action logic here
  });
}
