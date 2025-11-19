// src/ui/actionsBar/actionsConfig.js

export const ACTION_GROUPS = [
  {
    id: 'scene',
    label: 'Scene',
    actions: [
      { id: 'scene-prev', icon: 'chevron-left', tooltip: 'Previous stage' },
      { id: 'scene-next', icon: 'chevron-right', tooltip: 'Next stage' },
      { id: 'scene-random', icon: 'sparkles', tooltip: 'Random stage' }
    ]
  },
  {
    id: 'camera',
    label: 'Camera',
    actions: [
      { id: 'cam-overview', icon: 'frame', tooltip: 'Overview camera' },
      { id: 'cam-focus', icon: 'target', tooltip: 'Focus agent' },
      { id: 'cam-orbit', icon: 'orbit', tooltip: 'Orbit mode' }
    ]
  },
  {
    id: 'mood',
    label: 'Mood',
    actions: [
      { id: 'mood-chill', icon: 'wave', tooltip: 'Chill palette' },
      { id: 'mood-focus', icon: 'triangle', tooltip: 'Focus palette' },
      { id: 'mood-chaos', icon: 'flame', tooltip: 'Chaos palette' }
    ]
  },
  {
    id: 'tools',
    label: 'Tools',
    actions: [
      { id: 'tool-drawthings', icon: 'image', tooltip: 'Open in DrawThings' },
      { id: 'tool-figma', icon: 'figma', tooltip: 'Sync frame to Figma MCP' },
      { id: 'tool-debug', icon: 'bug', tooltip: 'Debug / Tweakpane' },
      { id: 'tool-log', icon: 'list', tooltip: 'Stage log' }
    ]
  }
];
