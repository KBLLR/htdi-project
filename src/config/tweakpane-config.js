// src/config/tweakpane-config.js

const CONFIG = {
  title: 'HTDI Controls',
  expanded: false,
  children: [
    {
      type: 'folder',
      title: 'Scene',
      expanded: false,
      children: [
        {
          type: 'folder',
          title: 'Camera',
          expanded: false,
          children: [
            { type: 'binding', path: 'camera.position', label: 'Position' },
            {
              type: 'binding',
              path: 'camera.fov',
              label: 'FOV',
              min: 10,
              max: 150,
              step: 1,
              onChange: (cam) => cam.updateProjectionMatrix(),
            },
            {
              type: 'button',
              title: 'Overview Preset',
              handler: 'activateCameraPreset',
              args: ['overview'],
            },
            {
              type: 'button',
              title: 'Focus Preset',
              handler: 'activateCameraPreset',
              args: ['focus'],
            },
          ],
        },
        {
          type: 'folder',
          title: 'Controls',
          children: [
            { type: 'binding', path: 'controls.enabled', label: 'Enabled' },
            { type: 'binding', path: 'controls.autoRotate', label: 'Auto Rotate' },
            {
              type: 'binding',
              path: 'controls.autoRotateSpeed',
              label: 'AutoRot Speed',
              min: -10,
              max: 10,
              step: 0.1,
            },
            { type: 'binding', path: 'controls.enableDamping', label: 'Damping On', initialValue: true },
            {
              type: 'binding',
              path: 'controls.dampingFactor',
              label: 'Damping',
              min: 0.01,
              max: 0.25,
              step: 0.005,
            },
            {
              type: 'binding',
              path: 'controls.minDistance',
              label: 'Min Dist',
              min: 0.01,
              max: 20,
              step: 0.01,
            },
            {
              type: 'binding',
              path: 'controls.maxDistance',
              label: 'Max Dist',
              min: 0.1,
              max: 100,
              step: 0.1,
            },
            { type: 'binding', path: 'controls.target', label: 'Target' },
          ],
        },
        {
          type: 'folder',
          title: 'Lights',
          expanded: false,
          children: [
            {
              type: 'binding',
              path: 'sceneRegistry.lights.directional.ref.intensity',
              label: 'Dir Intensity',
              min: 0,
              max: 5,
              step: 0.01,
            },
            { type: 'binding', path: 'sceneRegistry.lights.directional.ref.position', label: 'Dir Position' },
            { type: 'binding', path: 'sceneRegistry.lights.directional.ref.color', label: 'Dir Color' },
          ],
        },
        {
          type: 'folder',
          title: 'Environment',
          expanded: false,
          children: [
            // Environment controls will be added dynamically
          ],
        },
        {
          type: 'folder',
          title: 'Water',
          expanded: false,
          children: [],
        },
      ],
    },
    {
      type: 'folder',
      title: 'Rendering',
      expanded: false,
      children: [
        {
          type: 'folder',
          title: 'Post-processing',
          expanded: false,
          children: [
            {
              type: 'folder',
              title: 'Bloom',
              expanded: false,
              children: [
                { type: 'binding', path: 'sceneRegistry.postprocessing.bloomEffect.ref.enabled', label: 'Enabled' },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.luminanceThreshold',
                  label: 'Threshold',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.intensity',
                  label: 'Strength',
                  min: 0,
                  max: 5,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.luminanceSmoothing',
                  label: 'Radius',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
              ],
            },
            {
              type: 'folder',
              title: 'Depth of Field',
              expanded: false,
              children: [
                { type: 'binding', path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.enabled', label: 'Enabled' },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.focusDistance',
                  label: 'Focus',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.bokehScale',
                  label: 'Aperture',
                  min: 0,
                  max: 10,
                  step: 0.1,
                },
              ],
            },
            {
              type: 'folder',
              title: 'FXAA',
              expanded: false,
              children: [
                { type: 'binding', path: 'sceneRegistry.postprocessing.fxaaEffect.ref.enabled', label: 'Enabled' },
              ],
            },
          ],
        },
        {
          type: 'folder',
          title: 'Tone Mapping',
          expanded: false,
          children: [
            {
              type: 'binding',
              path: 'renderer.toneMappingExposure',
              label: 'Exposure',
              min: 0,
              max: 5,
              step: 0.01,
            },
          ],
        },
      ],
    },
    {
      type: 'folder',
      title: 'Assets',
      expanded: false,
      children: [
        {
          type: 'folder',
          title: 'Models',
          expanded: false,
          children: [
            { type: 'binding', path: 'sceneRegistry.meshes.outerMesh.ref.visible', label: 'Outer Mesh Visible' },
            // Models will be added dynamically
          ],
        },
        {
          type: 'folder',
          title: 'Characters',
          expanded: false,
          children: [
            // Character selector added dynamically
          ],
        },
        {
          type: 'folder',
          title: 'Material Library',
          expanded: false,
          children: [
            // Materials will be added dynamically
          ],
        },
        {
          type: 'folder',
          title: 'Kid Skins',
          expanded: false,
          children: [
            // Kid skins will be added dynamically
          ],
        },
        {
          type: 'folder',
          title: 'Textures',
          expanded: false,
          children: [
            // Texture controls will be added dynamically
          ],
        },
        {
          type: 'folder',
          title: 'Particles',
          expanded: false,
          children: [
            // Particle controls will be added here
          ],
        },
      ],
    },
    {
      type: 'folder',
      title: 'Performance',
      children: [{ type: 'fpsgraph', label: 'FPS' }],
    },
  ],
};

export default CONFIG;
