// Shared "distressed wordmark" texture + shader used by scene 1 (opening)
// and scene 6 (finale) so the two bookend reveals share one visual language.
export function buildWordCanvas(text, fontSize = 340) {
  const c = document.createElement('canvas');
  c.width = 2200; c.height = 620;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = `400 ${fontSize}px Anton, sans-serif`;
  const letters = text.split('');
  const spacing = fontSize * 0.02;
  let total = 0;
  const widths = letters.map((ch) => {
    const w = ctx.measureText(ch).width;
    total += w + spacing;
    return w;
  });
  total -= spacing;
  let x = (c.width - total) / 2;
  const baseline = c.height * 0.68;
  letters.forEach((ch, i) => {
    ctx.fillText(ch, x, baseline);
    x += widths[i] + spacing;
  });
  return c;
}

export function buildGlowCanvas(wordCanvas) {
  const c = document.createElement('canvas');
  c.width = wordCanvas.width; c.height = wordCanvas.height;
  const ctx = c.getContext('2d');
  ctx.filter = 'blur(26px)';
  ctx.drawImage(wordCanvas, 0, 0);
  ctx.filter = 'blur(0px)';
  return c;
}

export const WORD_VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
uniform vec2 uScale;
uniform vec2 uOffset;
void main(){
  vUv = aPos * 0.5 + 0.5;
  vec2 p = aPos * uScale + uOffset;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

export const WORD_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uWord;
uniform sampler2D uGlowTex;
uniform sampler2D uGrunge;
uniform float uProgress;
uniform vec2 uGrungeRepeat;
uniform vec3 uGlowA;
uniform vec3 uGlowB;
out vec4 frag;
void main(){
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float word = texture(uWord, uv).a;
  float glow = texture(uGlowTex, uv).a;
  float grunge = texture(uGrunge, uv * uGrungeRepeat).r;
  float leftBias = mix(-0.25, 1.25, uv.x);
  float threshold = uProgress * 1.4 - 0.2;
  float mask = smoothstep(threshold - 0.12, threshold + 0.12, grunge * 0.6 + leftBias * 0.4);
  mask = 1.0 - mask;
  mask *= step(0.0, uProgress);
  vec3 glowCol = mix(uGlowA, uGlowB, uv.x) * glow * mask * 1.4;
  vec3 wordCol = vec3(0.96, 0.98, 1.0) * word * mask;
  vec3 col = glowCol + wordCol;
  float alpha = clamp(glow * 0.9 + word, 0.0, 1.0) * mask;
  frag = vec4(col, alpha);
}`;
