// src/modules/devlogRules.js
// Regex-based classifier rules → produce actionable hints for humans/agents.
export const defaultRules = [
  {
    id: 'vite-import-resolve',
    test: /\bFailed to resolve import "([^"]+)" from "([^"]+)"/i,
    classify: ([, missing, from]) => ({
      code: 'RESOLVE_IMPORT',
      priority: 1,
      summary: `Unresolved import ${missing} in ${from}`,
      steps: [
        `Check path/alias for "${missing}" in ${from}.`,
        'Confirm file exists and matches case on disk.',
        'If aliased (e.g., @modules), verify vite.config alias → path.',
      ],
      refs: [{ type: 'file', value: from }, { type: 'import', value: missing }],
    }),
  },
  {
    id: 'vite-plugin-import-analysis',
    test: /\[plugin:vite:import-analysis]/i,
    classify: () => ({
      code: 'VITE_IMPORT_ANALYSIS',
      priority: 2,
      summary: 'Vite import-analysis error',
      steps: [
        'Open the referenced file; fix the import path or circular dependency.',
        'Ensure extensions (.js/.mjs) are included where needed.',
      ],
      refs: [],
    }),
  },
  {
    id: 'actionsbar-missing-button',
    test: /\[ActionsBarManager] Button with ID '([^']+)' not found/i,
    classify: ([, btn]) => ({
      code: 'UI_BUTTON_MISSING',
      priority: 2,
      summary: `Action button #${btn} missing in target container`,
      steps: [
        `Render button with id="${btn}" (via actions.json → buttonId).`,
        'Ensure ActionsBarManager target points to the footer group.',
        'Render buttons before registering handlers.',
      ],
      refs: [{ type: 'dom-id', value: btn }],
    }),
  },
  {
    id: 'uncaught-syntaxerror',
    test: /Uncaught SyntaxError:\s*(.+)/i,
    classify: ([, msg]) => ({
      code: 'SYNTAX_ERROR',
      priority: 0,
      summary: `SyntaxError: ${msg}`,
      steps: ['Open the referenced file at the caret location and fix the syntax.'],
      refs: [],
    }),
  },
  {
    id: 'uncaught-typeerror',
    test: /Uncaught TypeError:\s*(.+)/i,
    classify: ([, msg]) => ({
      code: 'TYPE_ERROR',
      priority: 1,
      summary: `TypeError: ${msg}`,
      steps: [
        'Check for null/undefined before property access.',
        'Verify selector/element exists before addEventListener().',
      ],
      refs: [],
    }),
  },
  {
    id: 'music-load-failed',
    test: /\[music] load failed/i,
    classify: () => ({
      code: 'MUSIC_LOAD_FAILED',
      priority: 2,
      summary: 'Music library failed to load',
      steps: [
        'Check musicLibrary paths and network errors in DevTools → Network.',
        'Validate track metadata JSON shape.',
      ],
      refs: [],
    }),
  },
  {
    id: 'scene-apply-failed',
    test: /Failed to apply scene/i,
    classify: () => ({
      code: 'SCENE_APPLY_FAILED',
      priority: 2,
      summary: 'Scene application failed',
      steps: [
        'Verify scene id exists in scene registry.',
        'Check assetRegistry and sceneFactory for missing assets.',
      ],
      refs: [],
    }),
  },
];
