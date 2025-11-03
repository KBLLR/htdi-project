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
            { type: 'binding', path: 'sceneRegistry.postprocessing.controller.ref.enabled', label: 'Composer On' },
            {
              type: 'folder',
              title: 'Bloom',
              expanded: false,
              children: [
                { type: 'binding', path: 'sceneRegistry.postprocessing.bloomEffect.ref.enabled', label: 'Enabled' },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.intensity',
                  label: 'Intensity',
                  min: 0,
                  max: 5,
                  step: 0.01,
                },
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
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.luminanceSmoothing',
                  label: 'Smoothing',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.resolution.scale',
                  label: 'Resolution',
                  min: 0.1,
                  max: 2,
                  step: 0.05,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.luminancePass.enabled',
                  label: 'Luminance Pass',
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.mipmapBlurPass.enabled',
                  label: 'Mipmap Blur',
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.mipmapBlurPass.radius',
                  label: 'Bloom Radius',
                  min: 0,
                  max: 2,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.mipmapBlurPass.levels',
                  label: 'Blur Levels',
                  min: 1,
                  max: 8,
                  step: 1,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.blendMode.opacity.value',
                  label: 'Blend Opacity',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.bloomEffect.ref.blurPass.kernelSize',
                  label: 'Kernel Size',
                  min: 0,
                  max: 5,
                  step: 1,
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
                  path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.focusRange',
                  label: 'Focus Range',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.focalLength',
                  label: 'Focal Length',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.bokehScale',
                  label: 'Bokeh',
                  min: 0,
                  max: 10,
                  step: 0.1,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.resolution.scale',
                  label: 'Resolution',
                  min: 0.1,
                  max: 2,
                  step: 0.05,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.blurPass.kernelSize',
                  label: 'Kernel Size',
                  min: 0,
                  max: 5,
                  step: 1,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.depthOfFieldEffect.ref.blendMode.opacity.value',
                  label: 'Blend Opacity',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
              ],
            },
            {
              type: 'folder',
              title: 'FXAA',
              expanded: false,
              children: [
                { type: 'binding', path: 'sceneRegistry.postprocessing.fxaaEffect.ref.enabled', label: 'Enabled' },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.fxaaEffect.ref.minEdgeThreshold',
                  label: 'Min Edge',
                  min: 0,
                  max: 1,
                  step: 0.001,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.fxaaEffect.ref.maxEdgeThreshold',
                  label: 'Max Edge',
                  min: 0,
                  max: 1,
                  step: 0.001,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.fxaaEffect.ref.subpixelQuality',
                  label: 'Subpixel',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.fxaaEffect.ref.samples',
                  label: 'Samples',
                  min: 1,
                  max: 32,
                  step: 1,
                },
                {
                  type: 'binding',
                  path: 'sceneRegistry.postprocessing.fxaaEffect.ref.blendMode.opacity.value',
                  label: 'Blend Opacity',
                  min: 0,
                  max: 1,
                  step: 0.01,
                },
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
            { type: 'binding', path: 'sceneRegistry.meshes.referenceCube.ref.visible', label: 'Reference Cube Visible' },
            {
              type: 'binding',
              path: 'sceneRegistry.meshes.referenceCube.ref.material.opacity',
              label: 'Reference Cube Opacity',
              min: 0,
              max: 1,
              step: 0.01,
            },
            {
              type: 'binding',
              path: 'sceneRegistry.meshes.referenceCube.ref.material.wireframe',
              label: 'Reference Cube Wireframe',
            },
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
