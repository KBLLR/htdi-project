// src/modules/pbr/pbrMaterialLoader.js
import * as THREE from 'three';
import { loadTextureAsset } from '@modules/assetRegistry.js';

/**
 * Maps user-defined “roles” from the asset set to MeshPhysicalMaterial properties.
 * Extend this map to support additional texture channels (specular, clearcoat, sheen, etc.).
 */
const MAP_ROLES = {
  // base colour / albedo
  albedo: { key: 'map', colorSpace: THREE.SRGBColorSpace },
  baseColor: { key: 'map', colorSpace: THREE.SRGBColorSpace },
  color: { key: 'map', colorSpace: THREE.SRGBColorSpace },
  diffuse: { key: 'map', colorSpace: THREE.SRGBColorSpace },

  // metallic / roughness
  metallic: { key: 'metalnessMap' },
  metalness: { key: 'metalnessMap' },
  roughness: { key: 'roughnessMap' },

  // normal / height / bump
  normal: { key: 'normalMap' },
  bump: { key: 'bumpMap' },
  bumpmap: { key: 'bumpMap' },
  height: { key: 'displacementMap' },
  displacement: { key: 'displacementMap' },
  heightmap: { key: 'displacementMap' },

  // ambient occlusion
  ao: { key: 'aoMap' },
  ambientOcclusion: { key: 'aoMap' },

  // transparency / alpha
  opacity: { key: 'alphaMap' },
  transparency: { key: 'alphaMap' },

  // emissive (self-illumination)
  emissive: { key: 'emissiveMap', colorSpace: THREE.SRGBColorSpace },
  emission: { key: 'emissiveMap', colorSpace: THREE.SRGBColorSpace },

  // sheen (fabric-like highlight)
  sheen: { key: 'sheenColorMap', colorSpace: THREE.SRGBColorSpace },
  sheenColor: { key: 'sheenColorMap', colorSpace: THREE.SRGBColorSpace },
  sheenRoughness: { key: 'sheenRoughnessMap' },

  // clear coat
  clearcoat: { key: 'clearcoatMap' },
  clearcoatRoughness: { key: 'clearcoatRoughnessMap' },
  clearcoatNormal: { key: 'clearcoatNormalMap' },

  // specular layer (for dielectrics)
  specular: { key: 'specularColorMap', colorSpace: THREE.SRGBColorSpace },
  specularColor: { key: 'specularColorMap', colorSpace: THREE.SRGBColorSpace },
  specularIntensity: { key: 'specularIntensityMap' },

  // iridescence
  iridescence: { key: 'iridescenceMap' },
  iridescenceThickness: { key: 'iridescenceThicknessMap' },
  iridescenceThicknessMap: { key: 'iridescenceThicknessMap' },
};

/**
 * Look up the material property configuration for a given map role.
 */
function resolveRole(fileRole) {
  return MAP_ROLES[fileRole] ?? null;
}

/**
 * Configure a texture with default wrapping and color space.  FlipY is disabled
 * because Three.js expects WebGL textures to have the origin at the bottom-left.
 */
function configureTexture(texture, { colorSpace, flipY = false } = {}) {
  if (!texture) return null;
  texture.flipY = flipY;
  if (colorSpace) texture.colorSpace = colorSpace;
  texture.wrapS ??= THREE.RepeatWrapping;
  texture.wrapT ??= THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Convert various color representations into a THREE.Color.
 */
function parseColor(value, fallback = 0xffffff) {
  const color = new THREE.Color(fallback);
  if (typeof value === 'string') {
    try { color.set(value); } catch (e) { console.warn('[pbr] invalid color', value, e); }
    return color;
  }
  if (Array.isArray(value) && value.length >= 3) {
    color.setRGB(value[0], value[1], value[2]);
    return color;
  }
  if (value && typeof value === 'object') {
    if (typeof value.r === 'number' && typeof value.g === 'number' && typeof value.b === 'number') {
      color.setRGB(value.r, value.g, value.b);
      return color;
    }
    if (Array.isArray(value.color)) {
      return parseColor(value.color, fallback);
    }
  }
  return color;
}

/**
 * Given a texture entry and a role, return a configured THREE.Texture or null.
 */
function loadTextureForEntry(set, entry, role) {
  if (!entry) return null;
  const config = resolveRole(role);
  if (!config) return null;
  const id = `pbr:${set.id}:${role}`;
  const texture = loadTextureAsset(id, entry.source, {});
  return configureTexture(texture, { colorSpace: config.colorSpace, flipY: false });
}

/**
 * Ensure that normalScale exists on the material and set it uniformly.
 */
function ensureNormalScale(material, normalScale = 1) {
  if (!material.normalScale) {
    material.normalScale = new THREE.Vector2(normalScale, normalScale);
  } else {
    material.normalScale.set(normalScale, normalScale);
  }
}

/**
 * Reset a MeshPhysicalMaterial to sensible defaults.  This should be called
 * before applying textures or parameters, to clear out any previous state.
 */
export function resetPhysicalMaterial(mat) {
  if (!mat) return;
  // base and metallic-roughness
  mat.color.set(0xffffff);
  mat.metalness = 0.0;
  mat.roughness = 0.5;
  // transmission / refraction
  mat.ior = 1.5;
  mat.transmission = 0.0;
  mat.thickness = 0.0;
  mat.attenuationColor = mat.attenuationColor || new THREE.Color(0xffffff);
  mat.attenuationColor.set(0xffffff);
  mat.attenuationDistance = Infinity;
  // clear coat
  mat.clearcoat = 0.0;
  mat.clearcoatRoughness = 0.0;
  // sheen
  mat.sheen = 0.0;
  mat.sheenColor = mat.sheenColor || new THREE.Color(0x000000);
  mat.sheenColor.set(0x000000);
  mat.sheenRoughness = 1.0;
  // specular
  mat.specularIntensity = 1.0;
  mat.specularColor = mat.specularColor || new THREE.Color(0xffffff);
  mat.specularColor.set(0xffffff);
  // iridescence
  mat.iridescence = 0.0;
  mat.iridescenceIOR = 1.3;
  mat.iridescenceThicknessRange = [100, 400];
  // emissive
  mat.emissive.set(0x000000);
  mat.emissiveIntensity = 0.0;
  // displacement/bump
  mat.displacementScale = 0.0;
  mat.displacementBias = 0.0;
  mat.bumpScale = 1.0;
  // environment/reflection
  mat.envMapIntensity = 1.0;
  mat.reflectivity = 0.5;
  mat.anisotropy = 0.0;
  mat.anisotropyRotation = 0.0;
  mat.dispersion = 0.0;
  // opacity/transparency
  mat.opacity = 1.0;
  mat.transparent = false;
}

/**
 * Apply numeric and color parameters to a MeshPhysicalMaterial.
 * Supported parameters are documented below.
 */
export function applyPbrParameters(material, parameters = {}) {
  if (!material) return;

  // metallic-roughness / environment
  if (typeof parameters.metalness === 'number') material.metalness = parameters.metalness;
  if (typeof parameters.roughness === 'number') material.roughness = parameters.roughness;
  if (typeof parameters.envMapIntensity === 'number') material.envMapIntensity = parameters.envMapIntensity;

  // clear coat
  if (typeof parameters.clearcoat === 'number') material.clearcoat = parameters.clearcoat;
  if (typeof parameters.clearcoatRoughness === 'number') material.clearcoatRoughness = parameters.clearcoatRoughness;

  // normal / displacement / bump scaling
  if (typeof parameters.normalScale === 'number') ensureNormalScale(material, parameters.normalScale);
  if (typeof parameters.displacementScale === 'number') material.displacementScale = parameters.displacementScale;
  if (typeof parameters.displacementBias === 'number') material.displacementBias = parameters.displacementBias;
  if (typeof parameters.bumpScale === 'number') material.bumpScale = parameters.bumpScale;

  // refractive properties
  if (typeof parameters.ior === 'number') material.ior = parameters.ior;
  if (typeof parameters.transmission === 'number') material.transmission = parameters.transmission;
  if (typeof parameters.thickness === 'number') material.thickness = parameters.thickness;

  // specular layer
  if (typeof parameters.specularIntensity === 'number') material.specularIntensity = parameters.specularIntensity;
  if (parameters.specularColor) {
    material.specularColor.copy(parseColor(parameters.specularColor, material.specularColor));
  }

  // emissive layer
  if (parameters.emissiveColor) {
    material.emissive.copy(parseColor(parameters.emissiveColor, material.emissive));
  }
  if (typeof parameters.emissiveIntensity === 'number') {
    material.emissiveIntensity = parameters.emissiveIntensity;
  }

  // iridescence
  if (typeof parameters.iridescence === 'number') material.iridescence = parameters.iridescence;
  if (typeof parameters.iridescenceIOR === 'number') material.iridescenceIOR = parameters.iridescenceIOR;
  if (typeof parameters.iridescenceThicknessMin === 'number' || typeof parameters.iridescenceThicknessMax === 'number') {
    const current = material.iridescenceThicknessRange ?? [100, 400];
    const min = typeof parameters.iridescenceThicknessMin === 'number' ? parameters.iridescenceThicknessMin : current[0];
    const max = typeof parameters.iridescenceThicknessMax === 'number' ? parameters.iridescenceThicknessMax : current[1];
    material.iridescenceThicknessRange = [min, max];
  }

  // opacity / transparency
  if (typeof parameters.opacity === 'number') {
    material.opacity = parameters.opacity;
  }
  if (typeof parameters.transparent === 'boolean') {
    material.transparent = parameters.transparent;
  } else {
    material.transparent = material.opacity < 1.0 || material.transmission > 0.0;
  }

  // attenuation (volumetric absorption)
  if (typeof parameters.attenuationDistance === 'number') {
    material.attenuationDistance = parameters.attenuationDistance > 0 ? parameters.attenuationDistance : Infinity;
  }
  if (parameters.attenuationColor) {
    const color = parseColor(parameters.attenuationColor, 0xffffff);
    material.attenuationColor ??= new THREE.Color(0xffffff);
    material.attenuationColor.copy(color);
  }

  // sheen layer
  if (typeof parameters.sheen === 'number') material.sheen = parameters.sheen;
  if (typeof parameters.sheenRoughness === 'number') material.sheenRoughness = parameters.sheenRoughness;

  // anisotropy
  if (typeof parameters.anisotropy === 'number') material.anisotropy = parameters.anisotropy;
  if (typeof parameters.anisotropyRotation === 'number') material.anisotropyRotation = parameters.anisotropyRotation;

  material.needsUpdate = true;
}

/**
 * High-level helper to load a complete PBR material from a set of textures and parameters.
 *
 * @param {Object} set     The PBR asset set containing map definitions.
 * @param {Object} options Optional options: { material, parameters }.
 * @returns {Promise<THREE.MeshPhysicalMaterial>}
 */
export async function loadPbrMaterial(set, {
  material,
  parameters = {},
} = {}) {
  if (!set) throw new Error('loadPbrMaterial: set is required');

  // use provided material or create a new MeshPhysicalMaterial
  const baseMaterial = material ?? new THREE.MeshPhysicalMaterial({ name: `PBR:${set.label}` });

  // reset the material to defaults
  resetPhysicalMaterial(baseMaterial);

  // load texture maps for each defined role in the set
  const mapEntries = set.maps ?? {};
  for (const [role, entry] of Object.entries(mapEntries)) {
    const config = resolveRole(role);
    if (!config) continue;
    const texture = loadTextureForEntry(set, entry, role);
    if (texture) {
      baseMaterial[config.key] = texture;
      // special-case normal maps (ensure proper type)
      if (config.key === 'normalMap') {
        texture.type = THREE.UnsignedByteType;
      }
      baseMaterial.needsUpdate = true;
    }
  }

  // if a color map is present, default the material's color to white so the texture shows through
  if (baseMaterial.map) {
    baseMaterial.color.set(0xffffff);
  }

  // apply numeric / color parameters to the material
  applyPbrParameters(baseMaterial, parameters);

  // store some metadata on userData
  baseMaterial.userData = {
    ...(baseMaterial.userData ?? {}),
    pbrSetId: set.id,
    pbrLabel: set.label,
  };

  return baseMaterial;
}

/**
 * Apply a material to all meshes under a root object.  If `override` is true,
 * any existing materials will be replaced; otherwise only empty material slots are filled.
 */
export function applyMaterialToObject(root, material, { override = true } = {}) {
  if (!root || !material) return;
  root.traverse?.((child) => {
    if (child.isMesh) {
      if (override || !child.material) {
        child.material = material;
        child.material.needsUpdate = true;
      }
    }
  });
}

/**
 * Apply raw material properties (usually loaded from GLTF/VRM metadata) to a material.
 * This helper resets the material then copies properties from the provided data object.
 */
export function applyMaterialProperties(mat, data) {
  if (!mat || !data) return;
  resetPhysicalMaterial(mat);

  // basic color assignment; choose SRGB colour space if available
  if (data.color) {
    const srgb = data.color.find((c) => c.colorSpace === 'srgb-linear');
    const acescg = data.color.find((c) => c.colorSpace === 'acescg');
    const colour = (srgb || acescg)?.color;
    if (colour) mat.color.setRGB(colour[0], colour[1], colour[2]);
  }

  // metallic-roughness
  if (typeof data.metalness === 'number') mat.metalness = data.metalness;
  if (typeof data.roughness === 'number') mat.roughness = data.roughness;

  // index of refraction (only for non-metals)
  if (mat.metalness < 1 && typeof data.ior === 'number') {
    mat.ior = data.ior;
  }

  // transmission / subsurface
  if (data.transmission) {
    mat.transmission = data.transmission;
    mat.thickness = data.transmissionDepth ?? 0.5;
    if (data.transmissionDispersion) mat.dispersion = data.transmissionDispersion;
  }

  // subsurface radius -> attenuation color / distance
  if (data.subsurfaceRadius) {
    mat.transmission = 1.0;
    mat.thickness = 1.0;
    mat.attenuationColor.setRGB(
      data.subsurfaceRadius[0],
      data.subsurfaceRadius[1],
      data.subsurfaceRadius[2]
    );
    mat.attenuationDistance = 1.0;
  }

  // thin film / iridescence
  if (data.thinFilmThickness && data.thinFilmIor) {
    mat.iridescence = 1.0;
    mat.iridescenceIOR = data.thinFilmIor;
    if (Array.isArray(data.thinFilmThickness)) {
      mat.iridescenceThicknessRange = [data.thinFilmThickness[0], data.thinFilmThickness[1]];
    }
  }

  // sheen
  if (typeof data.sheen === 'number') {
    mat.sheen = data.sheen;
    mat.sheenColor.set(0xffffff);
    mat.sheenRoughness = data.sheenRoughness ?? 1.0;
  }

  // specular for non-metals
  if (mat.metalness < 1) {
    if (data.specularColor && Array.isArray(data.specularColor)) {
      const firstFormat = data.specularColor[0];
      if (firstFormat && Array.isArray(firstFormat.color)) {
        const target = firstFormat.color.find((c) => c.colorSpace === 'srgb-linear') || firstFormat.color[0];
        if (target && target.color) {
          const [r, g, b] = target.color;
          mat.specularColor.setRGB(r, g, b);
        }
      }
    }
    if (typeof data.specularIntensity === 'number') {
      mat.specularIntensity = data.specularIntensity;
    }
  }

  // clearcoat / anisotropy
  if (typeof data.clearcoat === 'number') mat.clearcoat = data.clearcoat;
  if (typeof data.clearcoatRoughness === 'number') mat.clearcoatRoughness = data.clearcoatRoughness;
  if (typeof data.anisotropy === 'number') mat.anisotropy = data.anisotropy;
  if (typeof data.anisotropyRotation === 'number') mat.anisotropyRotation = data.anisotropyRotation;

  // emissive
  if (data.emissiveColor) {
    mat.emissive.copy(parseColor(data.emissiveColor, mat.emissive));
  }
  if (typeof data.emissiveIntensity === 'number') mat.emissiveIntensity = data.emissiveIntensity;

  // opacity (only if no transmission)
  if (!data.transmission && typeof data.opacity === 'number') {
    const opacityValue = Math.max(0, Math.min(1, data.opacity));
    mat.opacity = opacityValue;
    mat.transparent = opacityValue < 1.0;
  }

  // iridescence intensity / range
  if (typeof data.iridescence === 'number') mat.iridescence = data.iridescence;
  if (typeof data.iridescenceIOR === 'number') mat.iridescenceIOR = data.iridescenceIOR;
  if (Array.isArray(data.iridescenceThicknessRange) && data.iridescenceThicknessRange.length >= 2) {
    mat.iridescenceThicknessRange = [data.iridescenceThicknessRange[0], data.iridescenceThicknessRange[1]];
  } else if (typeof data.iridescenceThicknessMin === 'number' || typeof data.iridescenceThicknessMax === 'number') {
    const min = data.iridescenceThicknessMin ?? mat.iridescenceThicknessRange[0];
    const max = data.iridescenceThicknessMax ?? mat.iridescenceThicknessRange[1];
    mat.iridescenceThicknessRange = [min, max];
  }

  mat.needsUpdate = true;
}
