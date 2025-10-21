export function initAIAction(manager, { buttonId, ...params }) {
  manager.registerAction(buttonId, () => {
    console.log('AI Action triggered!', params);
    // TODO: Implement actual AI action logic here
  });
}
