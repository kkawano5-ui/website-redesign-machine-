export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const easeOutCubic = (p: number) => 1 - Math.pow(1 - clamp(p), 3);
export const easeInOut = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(p));
export const easeOutBack = (p: number) => {
  p = clamp(p);
  const c = 1.70158, s = c + 1;
  return 1 + s * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// emphasis scale 0.8 -> 1.12 -> 1.0
export const emphScale = (p: number) => {
  p = clamp(p);
  if (p < 0.6) return mix(0.8, 1.12, easeOutCubic(p / 0.6));
  return mix(1.12, 1.0, easeOutCubic((p - 0.6) / 0.4));
};

export const hexToRgb = (h: string) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const lerpColor = (a: string, b: string, t: number) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(mix(v, B[i], clamp(t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
