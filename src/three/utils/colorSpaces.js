// Utilities to pick/convert colors from your JSON entries into THREE linear-sRGB.

export function pickColorLinearSRGB(colorArray) {
  // Prefer a color entry already in linear sRGB.
  const srgbLin = colorArray?.find(c => c.colorSpace?.toLowerCase() === 'srgb-linear');
  if (srgbLin?.color) return clamp3(srgbLin.color);

  // Fallback: convert from ACEScg if present.
  const aces = colorArray?.find(c => c.colorSpace?.toLowerCase() === 'acescg')?.color;
  if (aces) return clamp3(acescgToLinearSRGB(aces));

  // As a last resort, first entry or neutral.
  return clamp3(colorArray?.[0]?.color || [1, 1, 1]);
}

export function pickSpecularLinearSRGB(specularArray) {
  // Prefer any specular color block that includes srgb-linear
  const first = specularArray?.find(Boolean);
  if (!first?.color) return [1, 1, 1];
  return pickColorLinearSRGB(first.color);
}

// Matrix from ACEScg to linear sRGB (approx.)
export function acescgToLinearSRGB([r, g, b]) {
  const m = [
    [ 1.7048, -0.6219, -0.0838],
    [-0.1303,  1.1406, -0.0103],
    [-0.0242, -0.1289,  1.1531],
  ];
  return clamp3([
    m[0][0]*r + m[0][1]*g + m[0][2]*b,
    m[1][0]*r + m[1][1]*g + m[1][2]*b,
    m[2][0]*r + m[2][1]*g + m[2][2]*b,
  ]);
}

function clamp3(v) { return v.map(x => Math.max(0, Math.min(1, x))); }