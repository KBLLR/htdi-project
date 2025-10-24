// src/modules/tpFromJson.js
// Tweakpane v4.0.5 JSON → Pane builder (robust, HMR-safe, plugin registered)

import { Pane } from 'tweakpane';
import * as Essentials from '@tweakpane/plugin-essentials'; // fpsgraph, interval, etc.

/** Resolve deep path like "a.b[0].c" on a given root object */
export function resolvePath(root, path) {
  if (!root || !path) return undefined;
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .reduce((acc, key) => (acc != null ? acc[key] : undefined), root);
}

/** Create a v4 pane, register Essentials, and wire HMR disposal */
export function createPane(opts = {}) {
  const pane = new Pane({ title: opts.title ?? 'Controls', expanded: opts.expanded ?? true });

  // Hard-assert v4 API (v3 had addInput/addMonitor instead)
  if (typeof pane.addBinding !== 'function') {
    throw new Error(
      'Expected Tweakpane v4.x (missing addBinding). Install tweakpane@4.0.5 and restart the dev server.'
    );
  }

  // Register the Essentials plugin ON THIS PANE (required for fpsgraph, etc.)
  // Safe to call once per pane instance.
  pane.registerPlugin(Essentials);

  // HMR-safe cleanup
  if (import.meta?.hot) {
    import.meta.hot.dispose(() => {
      try { pane.dispose(); } catch (e) { /* Ignore dispose errors during HMR */ console.warn('Failed to dispose Tweakpane during HMR', e); }
    });
  }

  return pane;
}

/** If FOV changes, keep projection in sync */
function maybeAttachFovProjection(binding, experience, path) {
  if (!binding || !experience?.camera || !path?.endsWith?.('.fov')) return;
  if (typeof binding.on === 'function') {
    binding.on('change', () => experience.camera.updateProjectionMatrix());
  }
}

/** Build a node (folder/binding/blade/button/separator/fpsgraph) */
export function buildNode(paneOrFolder, node, ctx) {
  const { experience } = ctx;

  switch (node.type) {
    case 'folder': {
      const f = paneOrFolder.addFolder({
        title: node.title ?? 'Folder',
        expanded: node.expanded ?? true
      });
      for (const child of node.children ?? []) buildNode(f, child, ctx);
      return f;
    }

    case 'binding': {
      const path = node.path || '';
      const objPath = path.split('.').slice(0, -1).join('.');
      const key = path.split('.').slice(-1)[0];
      const target = resolvePath(experience, objPath);

      if (!target || !(key in target)) {
        console.warn('[TP] Missing binding target:', path);
        return paneOrFolder.addBlade({
          view: 'text',
          label: node.label ?? path,
          value: '⚠ not found'
        });
      }

      const binding = paneOrFolder.addBinding(target, key, {
        label: node.label,
        min: node.min,
        max: node.max,
        step: node.step,
        options: node.options,
        readonly: node.readonly === true
      });

      maybeAttachFovProjection(binding, experience, path);
      return binding;
    }

    case 'button': {
      const b = paneOrFolder.addButton({ title: node.title ?? 'Action' });
      b.on('click', () => {
        const fn = resolvePath(experience, node.handler);
        if (typeof fn === 'function') {
          try { fn(...(node.args ?? [])); } catch (e) { console.error('[TP] handler error', e); }
        } else {
          console.warn('[TP] handler not found:', node.handler);
        }
      });
      return b;
    }

    case 'separator': {
      return paneOrFolder.addBlade({ view: 'separator' });
    }

    case 'fpsgraph': {
      // Requires Essentials plugin — registered in createPane()
      return paneOrFolder.addBlade({
        view: 'fpsgraph',
        label: node.label ?? 'FPS',
        rows: node.rows ?? 2
      });
    }

    case 'blade': {
      // Pass-through for arbitrary blade params
      return paneOrFolder.addBlade(
        node.params || { view: 'text', label: node.label ?? 'Blade', value: node.value ?? '' }
      );
    }

    default: {
      console.warn('[TP] Unknown node type:', node);
      return paneOrFolder.addBlade({
        view: 'text',
        label: 'Unknown node',
        value: JSON.stringify(node)
      });
    }
  }
}

/** Build an entire pane from JSON and return { pane, rebuild(nextJson) } */
export function buildPaneFromJson(experience, json) {
  const pane = createPane({ title: json.title, expanded: json.expanded });

  try {
    for (const child of json.children ?? []) buildNode(pane, child, { experience });
  } catch (e) {
    console.error('[TP] Build error:', e);
    pane.addBlade({ view: 'text', label: 'Error', value: String(e?.message || e) });
  }

  return {
    pane,
    rebuild(nextJson) {
      try { pane.children.forEach(ch => ch.dispose?.()); } catch (e) { /* Ignore dispose errors during rebuild */ console.warn('Failed to dispose Tweakpane children during rebuild', e); }
      try {
        for (const child of nextJson.children ?? []) buildNode(pane, child, { experience });
      } catch (e) {
        console.error('[TP] Rebuild error:', e);
      }
    }
  };
}
