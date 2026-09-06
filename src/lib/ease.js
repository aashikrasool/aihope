export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, t) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
// remaps t from [a,b] to [0,1] and eases it, clamped outside the range
export const beat = (t, a, b, easeFn = smoothstep) => easeFn(a, b, t);

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeOutQuint = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 5);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  const x = clamp(t, 0, 1);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
