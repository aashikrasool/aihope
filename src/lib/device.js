// Five simultaneous WebGL2 contexts is a real crash risk on memory-
// constrained mobile GPUs, independent of how small their textures are.
// On phones/low-memory devices we keep the signature hero scene (scene 1)
// but drop the other four to plain CSS backgrounds instead of WebGL.
export function isLitePower() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth <= 820;
  const lowMem = 'deviceMemory' in navigator && navigator.deviceMemory <= 4;
  return (coarse && narrow) || lowMem;
}
