// materials.js — JSON-aware, Three r180-safe material builder
// - Chooses proper material class per record (metal, dielectric, liquid/crystal, SSS-ish organics)
// - Maps JSON fields to valid Three.js options only (avoids unsupported props on MeshStandardMaterial)
// - Converts nested color entries (srgb-linear preferred) and clamps numeric ranges
// - Ignores schema extras (complexIor, transmissionDispersion, subsurfaceRadius) unless mappable

import * as THREE from 'three';
import {
  MeshStandardMaterial,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  DoubleSide,
  AdditiveBlending,
  Vector2,
  Color,
} from "three";

/** ─────────────────────────────────────────────────────────────────────────
 *  Helpers
 *  ───────────────────────────────────────────────────────────────────────── */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** Prefer srgb-linear if available, else first entry, else null */
function pickLinearRGBFromColorArray(colorField) {
  if (!colorField) return null;

  // Support: [r,g,b]
  if (Array.isArray(colorField) && colorField.length === 3 && colorField.every(isNum)) {
    return colorField;
  }

  // Support: [{ colorSpace, color:[r,g,b] }, ...]
  if (Array.isArray(colorField)) {
    // try srgb-linear first
    for (const entry of colorField) {
      if (entry && entry.colorSpace && entry.colorSpace.toLowerCase() === "srgb-linear" && Array.isArray(entry.color)) {
        return entry.color;
      }
    }
    // fallback to first valid
    for (const entry of colorField) {
      if (entry && Array.isArray(entry.color)) return entry.color;
    }
  }

  return null;
}

/** specularColor field is nested: [{ format, color:[ {colorSpace, color:[r,g,b]}, ...] }, ...] */
function pickSpecularLinearRGB(specularField) {
  if (!Array.isArray(specularField)) return null;
  for (const fmt of specularField) {
    if (!fmt || !Array.isArray(fmt.color)) continue;
    for (const c of fmt.color) {
      if (c && c.colorSpace && c.colorSpace.toLowerCase() === "srgb-linear" && Array.isArray(c.color)) {
        return c.color;
      }
    }
  }
  // fallback: first numeric triplet we find
  for (const fmt of specularField) {
    if (!fmt || !Array.isArray(fmt.color)) continue;
    for (const c of fmt.color) {
      if (c && Array.isArray(c.color)) return c.color;
    }
  }
  return null;
}

function toThreeColor(rgbArr, fallbackHex = 0xffffff) {
  const c = new Color(fallbackHex);
  if (Array.isArray(rgbArr) && rgbArr.length === 3) {
    // Values assumed linear
    c.setRGB(
      clamp01(rgbArr[0] ?? 1),
      clamp01(rgbArr[1] ?? 1),
      clamp01(rgbArr[2] ?? 1)
    );
  }
  return c;
}

/** Heuristic classification for which material model to use */
function classifyMaterialRecord(m) {
  const category = Array.isArray(m?.category) ? m.category : [];
  const tags = Array.isArray(m?.tags) ? m.tags : [];

  const isMetal = (isNum(m?.metalness) && m.metalness >= 1) || category.includes("Metal");
  if (isMetal) return "metal";

  const isTransparent =
    (isNum(m?.transmission) && m.transmission > 0) ||
    category.includes("Liquid") ||
    category.includes("Crystal") ||
    tags.includes("liquid") ||
    tags.includes("gem") ||
    tags.includes("gemstone");
  if (isTransparent) return "transparent";

  const wantsSSS =
    m?.subsurfaceRadius ||
    category.includes("Human") ||
    category.includes("Organic") ||
    tags.includes("sss");
  if (wantsSSS) return "sss";

  return "dielectric";
}

/** Filter option keys to avoid assigning unsupported props per class */
function pickAllowedOptionsFor(klass, opts) {
  const base = [
    "color",
    "roughness",
    "metalness",
    "map",
    "normalMap",
    "normalScale",
    "emissive",
    "emissiveIntensity",
    "envMap",
    "envMapIntensity",
    "transparent",
    "opacity",
    "alphaTest",
    "side",
    "blending",
    "depthWrite",
    "wireframe",
    "flatShading",
    "fog",
    "precision",
  ];

  const physicalExtra = [
    "ior",
    "transmission",
    "thickness",
    "attenuationColor",
    "attenuationDistance",
    "specularIntensity",
    "specularColor",
    "clearcoat",
    "clearcoatRoughness",
    "sheen",
    "sheenColor",
    "sheenRoughness",
    "iridescence",
    "iridescenceIOR",
    "iridescenceThicknessRange",
    "iridescenceThicknessMinimum",
    "iridescenceThicknessMaximum",
    // "dispersion" // only if your three build supports it; excluded by default to avoid warnings
  ];

  const allow = klass === MeshPhysicalMaterial ? base.concat(physicalExtra) : base;
  const out = {};
  for (const k of allow) {
    if (opts[k] !== undefined) out[k] = opts[k];
  }
  return out;
}

/** Domain heuristics to map JSON fields → Three material options safely */
function mapRecordToMaterialOptions(m) {
  const kind = classifyMaterialRecord(m);

  // Base/Albedo color (linear)
  const baseRGB = pickLinearRGBFromColorArray(m?.color) ?? [1, 1, 1];
  const baseColor = toThreeColor(baseRGB, 0xffffff);

  // Specular for dielectrics (MeshPhysicalMaterial only)
  const specRGB = pickSpecularLinearRGB(m?.specularColor);
  const specColor = specRGB ? toThreeColor(specRGB, 0xffffff) : null;

  // Common
  const roughness = isNum(m?.roughness) ? clamp01(m.roughness) : (kind === "metal" ? 0.1 : kind === "dielectric" ? 0.6 : 0.2);
  const metalness = kind === "metal" ? 1 : clamp01(isNum(m?.metalness) ? m.metalness : 0);

  // Transmission / SSS approximations (Physical)
  const hasTransmission = kind === "transparent" || kind === "sss";
  const transmission = hasTransmission ? clamp01(isNum(m?.transmission) ? m.transmission : (kind === "transparent" ? 1 : 0.35)) : 0;

  // Map "transmissionDepth" (dataset) → Three's "thickness" & "attenuationDistance"
  // Heuristic: thickness in meters-ish; attenuationDistance in meters, > 0
  const depth = isNum(m?.transmissionDepth) ? Math.max(0, m.transmissionDepth) : (kind === "sss" ? 0.1 : 0.02);
  const thickness = hasTransmission ? Math.max(0.001, depth) : 0;

  // For attenuation, use the base color as scattering tint; distance scaled from depth
  const attenuationColor = hasTransmission ? baseColor.clone() : undefined;
  const attenuationDistance = hasTransmission ? Math.max(0.005, depth * 10) : undefined;

  // IOR is for Physical; use dataset ior for liquids/crystals/human; default 1.5
  const ior = hasTransmission ? (isNum(m?.ior) ? Math.max(1, m.ior) : (kind === "sss" ? 1.4 : 1.5)) : undefined;

  // Specular only meaningful for MeshPhysicalMaterial with metalness < 1
  const specularColor = specRGB && metalness < 1 ? specColor : undefined;
  const specularIntensity = specularColor ? 1.0 : undefined;

  // Manmade mattes (brick, concrete, blackboard) want higher roughness
  if (Array.isArray(m?.category) && m.category.includes("Manmade") && metalness < 1 && !hasTransmission) {
    // preserve dataset roughness if provided
  }

  return {
    kind,
    options: {
      color: baseColor,
      roughness,
      metalness,
      // Transparent / SSS (Physical only)
      ior,
      transmission,
      thickness,
      attenuationColor,
      attenuationDistance,
      // Dielectric specular (Physical only)
      specularColor,
      specularIntensity,
      // Reasonable defaults
      side: DoubleSide,
    },
  };
}

/** ─────────────────────────────────────────────────────────────────────────
 *  Public factory helpers (unchanged signatures, with sane values)
 *  ───────────────────────────────────────────────────────────────────────── */

export function createAlphaMaterial(options = {}) {
  return new MeshStandardMaterial({
    transparent: true,
    side: DoubleSide,
    alphaTest: 0.5,
    roughness: 1, // clamp to valid range
    wireframe: true,
    fog: false,
    ...options,
  });
}

export function createInnerSphereMaterial(options = {}) {
  return new MeshLambertMaterial({
    side: DoubleSide,
    emissive: 0xffffff,
    emissiveIntensity: 3.4,
    transparent: true,
    opacity: 0.68,
    blending: AdditiveBlending,
    depthWrite: false,
    precision: "highp",
    fog: false,
    envMap: null,
    map: options.map, // Add map option here
    ...options,
  });
}

export function createKidMaterial(options = {}) {
  return new MeshPhysicalMaterial({
    color: 0xffdead,
    transparent: false,
    opacity: 0.98,
    metalness: clamp01(0.1),
    roughness: clamp01(0.6),
    normalScale: new Vector2(2, 2),
    ior: 1.2,
    thickness: 0.1,
    specularIntensity: 0.5,
    specularColor: new Color(0xbc8f8f),
    envMapIntensity: 2.5,
    ...options,
  });
}

export function createGroundMaterial(options = {}) {
  return new MeshStandardMaterial({
    color: 0x6495ed,
    roughness: clamp01(0.6),
    metalness: clamp01(0.1),
    normalScale: new Vector2(3, 3),
    ...options,
  });
}

/** ─────────────────────────────────────────────────────────────────────────
 *  Main: load & build materials from JSON
 *  materialsJsonUrl: URL to an array of records (see materials.json)
 *  returns { [name]: THREE.Material }
 *  ───────────────────────────────────────────────────────────────────────── */
export async function loadMaterialsFromJson(materialsJsonUrl) {
  const res = await fetch(materialsJsonUrl);
  if (!res?.ok) {
    console.error(`Failed to load materials from ${materialsJsonUrl}: ${res?.status} ${res?.statusText}`);
    return {};
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.error("Failed to parse materials JSON:", e);
    return {};
  }

  const records = Array.isArray(data) ? data : Array.isArray(data?.materials) ? data.materials : [];
  if (!records.length) {
    console.warn("No material records found in JSON.");
    return {};
  }

  /** Build */
  const out = {};
  for (const m of records) {
    const name = m?.name;
    if (!name) {
      console.warn("Skipping material without name:", m);
      continue;
    }

    const { kind, options } = mapRecordToMaterialOptions(m);
    let material;

    if (kind === "metal") {
      // Metals: standard model (no ior/specularColor on Standard)
      const opts = pickAllowedOptionsFor(MeshStandardMaterial, options);
      // ensure full metal
      opts.metalness = 1;
      material = new MeshStandardMaterial(opts);
    } else if (kind === "transparent" || kind === "sss") {
      // Liquids/Crystals/SSS-ish: physical with transmission, thickness, attenuation
      const opts = pickAllowedOptionsFor(MeshPhysicalMaterial, options);
      // guard: specular only meaningful for non-metals
      if (opts.metalness >= 1) {
        delete opts.specularColor;
        delete opts.specularIntensity;
      }
      material = new MeshPhysicalMaterial(opts);
    } else {
      // Dielectrics (plastics, stone, brick, concrete, etc.)
      const opts = pickAllowedOptionsFor(MeshStandardMaterial, options);
      // Ensure non-metal
      opts.metalness = clamp01(Math.min(opts.metalness ?? 0, 0.95));
      // Remove physical-only props if any sneaked in
      delete opts.ior;
      delete opts.transmission;
      delete opts.thickness;
      delete opts.attenuationColor;
      delete opts.attenuationDistance;
      delete opts.specularColor;
      delete opts.specularIntensity;
      material = new MeshStandardMaterial(opts);
    }

    out[name] = material;
  }

  return out;
}

/** Optional: export for diagnostics */
export function __classifyMaterialRecordForDebug(m) {
  return classifyMaterialRecord(m);
}
