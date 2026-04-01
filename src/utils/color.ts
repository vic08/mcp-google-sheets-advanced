export function hexToGoogleColor(hex: string): {
  red: number;
  green: number;
  blue: number;
  alpha: number;
} {
  let h = hex.replace(/^#/, '');

  // Expand 3-char hex
  if (h.length === 3) {
    h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  }

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  return {
    red: Math.round(r * 1000) / 1000,
    green: Math.round(g * 1000) / 1000,
    blue: Math.round(b * 1000) / 1000,
    alpha: 1.0,
  };
}

export function googleColorToHex(color: {
  red?: number | null;
  green?: number | null;
  blue?: number | null;
}): string {
  const r = Math.round((color.red ?? 0) * 255);
  const g = Math.round((color.green ?? 0) * 255);
  const b = Math.round((color.blue ?? 0) * 255);

  return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
}
