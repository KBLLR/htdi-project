export function initTasksAction(manager, { buttonId, focusTarget = '#tasks-board', ...params }) {
  manager.registerAction(buttonId, () => {
    manager.eventBus.emit('modal:open', { id: 'tasks', focusTarget });
    console.log('Tasks Action triggered!', params);
  });
}
