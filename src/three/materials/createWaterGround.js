// src/three/materials/createWaterGround.js
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { loadTextureAsset } from '@modules/assetRegistry.js';

const DEFAULT_RADIUS = 15;
const DEFAULT_SEGMENTS = 96;

const DEFAULT_NORMAL_SRC = 'https://threejs.org/examples/textures/waternormals.jpg';

const DEFAULT_WATER_OPTIONS = {
  textureWidth: 512,
  textureHeight: 512,
  alpha: 0.92,
  waterColor: 0x13435c,
  sunColor: 0xffffff,
  sunDirection: new THREE.Vector3(0.45, 0.82, 0.35),
  distortionScale: 3.2,
  scale: 3.4,
  timeSpeed: 0.18,
  normalTextureSize: 512,
  normalAmplitude: 0.5,
};

function createProceduralWaterNormal({
  size = 256,
  frequency = 4,
  phase = 0,
  amplitude = 0.55,
} = {}) {
  const width = Math.max(8, size | 0);
  const height = width;
  const data = new Uint8Array(width * height * 4);

  let ptr = 0;
  for (let y = 0; y < height; y += 1) {
    const v = (y / height) * Math.PI * frequency;
    for (let x = 0; x < width; x += 1) {
      const u = (x / width) * Math.PI * frequency;
      const nx = Math.sin(u + phase) * amplitude;
      const nz = Math.cos(v + phase) * amplitude;
      const normal = new THREE.Vector3(nx, 1, nz).normalize();

      data[ptr + 0] = Math.round((normal.x * 0.5 + 0.5) * 255);
      data[ptr + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      data[ptr + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      data[ptr + 3] = 255;
      ptr += 4;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.name = 'procedural-water-normal';
  return texture;
}

function ensureWaterNormalTexture({
  id = 'texture:water:normals',
  src,
  phase = 0,
  size,
  amplitude,
  anisotropy,
  proceduralFallback = true,
} = {}) {
  const source = src ?? DEFAULT_NORMAL_SRC;
  if (source) {
    const texture = loadTextureAsset(id, source, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearMipMapLinearFilter,
      colorSpace: THREE.NoColorSpace,
      anisotropy,
      onLoad: (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      },
    });
    if (texture) {
      texture.needsUpdate = true;
      return texture;
    }
  }

  if (!proceduralFallback) {
    return null;
  }

  const texture = createProceduralWaterNormal({ size, amplitude, phase });
  texture.anisotropy = anisotropy ?? texture.anisotropy;
  texture.name = id;
  return texture;
}

function ensureCircleGeometry(geometry, { radius = DEFAULT_RADIUS, segments = DEFAULT_SEGMENTS } = {}) {
  if (geometry) return geometry;
  return new THREE.CircleGeometry(radius, segments);
}

export function createWater({
  geometry,
  radius,
  segments,
  options = {},
  sceneFog = false,
  assets = {},
} = {}) {
  const mergedOptions = {
    ...DEFAULT_WATER_OPTIONS,
    ...options,
  };

  const resolvedGeometry = ensureCircleGeometry(geometry, { radius, segments });

  const waterNormals = ensureWaterNormalTexture({
    id: assets.normalId ?? 'texture:water:normals',
    src: assets.normalSrc,
    phase: assets.normalPhase ?? 0,
    size: mergedOptions.normalTextureSize,
    amplitude: mergedOptions.normalAmplitude,
    anisotropy: mergedOptions.anisotropy,
  });

  const water = new Water(resolvedGeometry, {
    textureWidth: mergedOptions.textureWidth,
    textureHeight: mergedOptions.textureHeight,
    waterNormals,
    alpha: mergedOptions.alpha,
    sunDirection: mergedOptions.sunDirection.clone().normalize(),
    sunColor: mergedOptions.sunColor,
    waterColor: mergedOptions.waterColor ?? mergedOptions.color,
    distortionScale: mergedOptions.distortionScale,
    fog: sceneFog,
  });

  water.rotation.x = -Math.PI / 2;
  water.receiveShadow = true;
  water.name = mergedOptions.name ?? 'water';

  const uniforms = water.material?.uniforms ?? {};
  if (uniforms.size) {
    uniforms.size.value = mergedOptions.scale;
  }
  if (uniforms.alpha) {
    uniforms.alpha.value = mergedOptions.alpha;
  }
  if (uniforms.waterColor) {
    uniforms.waterColor.value.set(mergedOptions.waterColor ?? mergedOptions.color);
  }
  if (uniforms.sunColor) {
    uniforms.sunColor.value.set(mergedOptions.sunColor);
  }
  if (uniforms.sunDirection) {
    uniforms.sunDirection.value.copy(mergedOptions.sunDirection).normalize();
  }
  if (uniforms.distortionScale) {
    uniforms.distortionScale.value = mergedOptions.distortionScale;
  }
  if (uniforms.fog) {
    uniforms.fog.value = sceneFog ? 1 : 0;
  }
  if (typeof mergedOptions.reflectionIntensity === 'number' && uniforms.mirrorSampler && uniforms.alpha) {
    uniforms.alpha.value = mergedOptions.alpha;
  }

  const timeSpeed = mergedOptions.timeSpeed ?? 1;
  const frameMonitor = uniforms.time
    ? {
        begin: ({ deltaTime }) => {
          uniforms.time.value += deltaTime * timeSpeed;
        },
      }
    : null;

  return {
    water,
    waterNormals,
    frameMonitor,
  };
}

function createRadialGradientTexture({
  size = 512,
  innerRadius = 0.18,
  outerRadius = 1.05,
  innerColor = new THREE.Color(0x0a1621),
  outerColor = new THREE.Color(0x010305),
  alphaFalloff = [1, 0.25],
} = {}) {
  const resolution = Math.max(16, size | 0);
  const data = new Uint8Array(resolution * resolution * 4);
  const center = (resolution - 1) / 2;
  const maxDistance = outerRadius * center;
  const minDistance = innerRadius * center;
  const color = new THREE.Color();

  let ptr = 0;
  for (let y = 0; y < resolution; y += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const t = THREE.MathUtils.clamp((distance - minDistance) / Math.max(1e-5, maxDistance - minDistance), 0, 1);

      color.copy(innerColor).lerp(outerColor, t);
      data[ptr + 0] = Math.round(THREE.MathUtils.clamp(color.r, 0, 1) * 255);
      data[ptr + 1] = Math.round(THREE.MathUtils.clamp(color.g, 0, 1) * 255);
      data[ptr + 2] = Math.round(THREE.MathUtils.clamp(color.b, 0, 1) * 255);

      const alpha = THREE.MathUtils.clamp(THREE.MathUtils.lerp(alphaFalloff[0], alphaFalloff[1], t ** 1.35), 0, 1);
      data[ptr + 3] = Math.round(alpha * 255);
      ptr += 4;
    }
  }

  const texture = new THREE.DataTexture(data, resolution, resolution, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = 'ground-radial-gradient';
  return texture;
}

export function createGround({
  geometry,
  radius,
  segments,
  material,
  overrides = {},
} = {}) {
  const resolvedGeometry = ensureCircleGeometry(geometry, { radius, segments });
  const gradientTexture =
    overrides.gradientTexture ??
    createRadialGradientTexture({
      size: 512,
      innerRadius: 0.22,
      outerRadius: 1.08,
    });

  const baseMaterial =
    overrides.material ??
    material ??
    new THREE.MeshStandardMaterial({
      color: 0x162230,
      roughness: 0.88,
      metalness: 0.02,
      map: gradientTexture,
    });

  baseMaterial.side = THREE.DoubleSide;
  baseMaterial.map = gradientTexture;
  baseMaterial.map.needsUpdate = true;
  baseMaterial.needsUpdate = true;

  const ground = new THREE.Mesh(resolvedGeometry, baseMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = overrides.name ?? 'ground';

  return {
    ground,
    material: baseMaterial,
  };
}

export function createWaterAndGround({
  waterGeometry,
  waterRadius,
  waterSegments,
  groundGeometry,
  groundRadius,
  groundSegments,
  groundMaterial,
  waterOptions,
  waterAssets,
  groundOverrides,
  sceneFog,
} = {}) {
  const { water, waterNormals, frameMonitor } = createWater({
    geometry: waterGeometry,
    radius: waterRadius,
    segments: waterSegments,
    options: waterOptions,
    assets: waterAssets ?? {},
    sceneFog,
  });

  const { ground, material: resolvedGroundMaterial } = createGround({
    geometry: groundGeometry,
    radius: groundRadius,
    segments: groundSegments,
    material: groundMaterial,
    overrides: groundOverrides ?? {},
  });

  return {
    water,
    ground,
    waterNormals,
    frameMonitor,
    groundMaterial: resolvedGroundMaterial,
  };
}
