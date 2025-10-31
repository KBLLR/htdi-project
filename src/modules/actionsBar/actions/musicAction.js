export function initMusicAction(manager, { buttonId, ...params }) {
  manager.registerAction(buttonId, () => {
    console.log('Music Action triggered!', params);
    // TODO: Implement actual music action logic here, using ensureMusicLibraryLoaded and getCurrentTrack
  });
}
