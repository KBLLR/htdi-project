export function initDeploymentsAction(manager, { buttonId, ...params }) {
  manager.registerAction(buttonId, () => {
    console.log('Deployments Action triggered!', params);
    // TODO: Implement actual deployments action logic here
  });
}
