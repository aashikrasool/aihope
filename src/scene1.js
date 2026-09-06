// Scene 1 — the opening. Black screen -> the AIHOPE wordmark resolves out of a
// distressed dissolve -> the eyebrow/tagline/CTAs and header draw themselves in.
import { createGL, program, quad, bindQuad, FULLSCREEN_VS, fitCanvas, texFromImage } from './lib/glutil.js';
import { createEmbers } from './lib/particles.js';
import { clamp, smoothstep, easeOutBack, prefersReducedMotion } from './lib/ease.js';
import { buildWordCanvas, buildGlowCanvas, WORD_VS, WORD_FS } from './lib/wordfx.js';

const PLATE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uGlow;
out vec4 frag;

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main(){
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uRes.x / uRes.y;

  vec3 ink = vec3(0.015, 0.02, 0.035);
  float vig = 1.0 - smoothstep(0.4, 1.35, length(p));

  vec3 a = vec3(0.16, 0.64, 1.0);   // cyan
  vec3 b = vec3(0.42, 0.33, 1.0);   // violet
  vec2 c1 = vec2(-0.35, 0.55);
  vec2 c2 = vec2(0.5, -0.5);
  float g1 = exp(-length(p - c1) * 1.6) * (0.5 + 0.5 * sin(uTime * 0.25));
  float g2 = exp(-length(p - c2) * 1.7) * (0.5 + 0.5 * sin(uTime * 0.31 + 2.0));

  vec3 col = ink + (a * g1 + b * g2) * 0.55 * uGlow;
  col *= mix(0.55, 1.0, vig);

  float grain = (hash(uv * uRes.xy * 0.4 + uTime * 60.0) - 0.5) * 0.035;
  col += grain;

  frag = vec4(col, 1.0);
}`;

export function bootScene1(root) {
  const canvas = root.querySelector('[data-s1-canvas]');
  const eyebrow = root.querySelector('[data-s1-eyebrow]');
  const lead = root.querySelector('[data-s1-lead]');
  const actions = root.querySelector('[data-s1-actions]');
  const header = document.querySelector('[data-header]');
  if (!canvas) return;

  const gl = createGL(canvas);
  const plateProg = program(gl, FULLSCREEN_VS, PLATE_FS);
  const wordProg = program(gl, WORD_VS, WORD_FS);
  const buf = quad(gl);

  const wordCanvas = buildWordCanvas('AIHOPE');
  const glowCanvas = buildGlowCanvas(wordCanvas);
  let wordTex, glowTex, grungeTex;
  const ready = { word: false, grunge: false };

  wordTex = texFromImage(gl, wordCanvas);
  glowTex = texFromImage(gl, glowCanvas);
  ready.word = true;

  const grungeImg = new Image();
  grungeImg.onload = () => { grungeTex = texFromImage(gl, grungeImg); ready.grunge = true; };
  grungeImg.src = 'public/tex/grunge.png';

  const embers = createEmbers(gl, 90);

  const reduced = prefersReducedMotion();
  const START = performance.now();
  const DUR_GLOW = 900;
  const DUR_WORD = [700, 2500];
  const DUR_FURNITURE = [2500, 3300];

  let raf = null;
  let running = true;
  let mouse = [0, 0];
  window.addEventListener('pointermove', (e) => {
    mouse = [(e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1];
  }, { passive: true });

  function fireFurniture(p) {
    if (!eyebrow) return;
    eyebrow.style.opacity = p;
    eyebrow.style.transform = `translateY(${(1 - p) * 14}px)`;
    lead.style.opacity = p;
    lead.style.transform = `translateY(${(1 - p) * 18}px)`;
    actions.style.opacity = p;
    actions.style.transform = `translateY(${(1 - p) * 22}px)`;
    if (p > 0.05) header.classList.add('is-drawn');
  }

  function frame(now) {
    if (!running) { raf = null; return; }
    const t = reduced ? 999999 : now - START;
    fitCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const glowP = reduced ? 1 : smoothstep(0, DUR_GLOW, t);
    const wordP = reduced ? 1 : smoothstep(DUR_WORD[0], DUR_WORD[1], t);
    const furP = reduced ? 1 : smoothstep(DUR_FURNITURE[0], DUR_FURNITURE[1], t);
    fireFurniture(furP);

    gl.disable(gl.BLEND);
    gl.useProgram(plateProg);
    bindQuad(gl, buf, plateProg);
    gl.uniform2f(gl.getUniformLocation(plateProg, 'uRes'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(plateProg, 'uTime'), t * 0.001);
    gl.uniform1f(gl.getUniformLocation(plateProg, 'uGlow'), 0.25 + glowP * 0.85);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (ready.grunge) {
      const aspect = wordCanvas.width / wordCanvas.height;
      const canvasAspect = canvas.width / canvas.height;
      let sx = 0.66, sy = sx / aspect * canvasAspect;
      if (canvasAspect < 1) { sx = 0.92; sy = sx / aspect * canvasAspect; }
      const settle = easeOutBack(Math.min(1, wordP * 1.15));
      const scaleMul = 0.94 + settle * 0.06;
      const parX = mouse[0] * 0.012;
      const parY = mouse[1] * 0.008;

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(wordProg);
      bindQuad(gl, buf, wordProg);
      gl.uniform2f(gl.getUniformLocation(wordProg, 'uScale'), sx * scaleMul, sy * scaleMul);
      gl.uniform2f(gl.getUniformLocation(wordProg, 'uOffset'), parX, -0.03 + parY);
      gl.uniform1f(gl.getUniformLocation(wordProg, 'uProgress'), wordP);
      gl.uniform2f(gl.getUniformLocation(wordProg, 'uGrungeRepeat'), 2.0, 1.4);
      gl.uniform3f(gl.getUniformLocation(wordProg, 'uGlowA'), 0.18, 0.62, 1.0);
      gl.uniform3f(gl.getUniformLocation(wordProg, 'uGlowB'), 0.55, 0.4, 1.0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, wordTex);
      gl.uniform1i(gl.getUniformLocation(wordProg, 'uWord'), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glowTex);
      gl.uniform1i(gl.getUniformLocation(wordProg, 'uGlowTex'), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, grungeTex);
      gl.uniform1i(gl.getUniformLocation(wordProg, 'uGrunge'), 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.enable(gl.BLEND);
    embers.draw(t * 0.001, {
      area: [0.9, 1.0], center: [0, -0.2], speed: 0.5, size: 26 * (window.devicePixelRatio || 1),
      hot: [0.6, 0.85, 1.0], cool: [0.5, 0.4, 1.0], opacity: 0.5 + glowP * 0.4,
    });

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const io = new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running && !raf) raf = requestAnimationFrame(frame);
  }, { threshold: 0 });
  io.observe(canvas);

  if (reduced) fireFurniture(1);
}
