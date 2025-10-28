export function initDeploymentsAction(manager, { buttonId, toggleTimeline, ...params }) {
  manager.registerAction(buttonId, () => {
    console.log('Deployments Action triggered!', params);
    if (typeof toggleTimeline === 'function') {
      toggleTimeline();
    } else {
      console.warn('[DeploymentsAction] toggleTimeline not provided.', params);
    }
  });
}
