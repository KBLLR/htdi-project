// src/modules/TweakpaneMaterials.js
// Adds a "Material Library" folder to an existing Tweakpane pane.
export function attachMaterialsPane(pane, experience) {
  const lib = experience.materialLibrary;
  if (!lib || !lib.names?.length) return;

  const folder = pane.addFolder({ title: 'Material Library', expanded: false });
  const state = { preset: lib.names[0], target: 'alphaMat' };
  const targets = [
    { text: 'Outer Mesh (alphaMat)', value: 'alphaMat' },
    { text: 'Inner Sphere', value: 'innerSphereMaterial' }
  ];

  folder.addBinding(state, 'preset', { label: 'Preset', options: toOptions(lib.names) });
  folder.addBinding(state, 'target', { label: 'Target', options: targets });

  folder.addButton({ title: 'Apply' }).on('click', () => {
    const ok = experience.applyMaterialPreset(state.target, state.preset);
    if (!ok) console.warn('[materials] apply failed:', state);
  });
}

function toOptions(names) {
  // Tweakpane v4 expects [{text, value}, ...]
  return names.map(n => ({ text: n, value: n }));
}
