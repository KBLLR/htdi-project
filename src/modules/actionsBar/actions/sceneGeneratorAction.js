export function initSceneGeneratorAction(manager, { buttonId, ...params }) {
  manager.registerAction(buttonId, () => {
    console.log('Scene Generator Action triggered!', params);
    // TODO: Implement actual scene generator action logic here
  });
}
