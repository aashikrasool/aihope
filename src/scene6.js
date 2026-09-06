// Scene 6 — the finale. The AIHOPE wordmark resolves a second time, through a
// slow violet fog, as the visitor reaches the bottom of the page; the quote
// and functional row (contact, socials, copyright) hold the edges.
import { createGL, program, quad, bindQuad, FULLSCREEN_VS, fitCanvas, texFromImage } from './lib/glutil.js';
import { createEmbers } from './lib/particles.js';
import { clamp, smoothstep, prefersReducedMotion } from './lib/ease.js';
import { buildWordCanvas, buildGlowCanvas, WORD_VS, WORD_FS } from './lib/wordfx.js';

const PLATE_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform vec2 uRes; uniform float uTime; uniform float uGlow; out vec4 frag;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
void main(){
  vec2 p = vUv*2.0-1.0; p.x *= uRes.x/uRes.y;
  vec3 ink = vec3(0.012,0.014,0.024);
  float pulse = 0.5 + 0.5*sin(uTime*0.35);
  float g1 = exp(-length(p-vec2(-0.3,-0.4))*1.4) * pulse;
  float g2 = exp(-length(p-vec2(0.4,0.3))*1.5) * (1.0-pulse);
  vec3 col = ink + (vec3(0.4,0.3,1.0)*g1 + vec3(0.15,0.55,1.0)*g2) * 0.5 * uGlow;
  float vig = 1.0 - smoothstep(0.4,1.35,length(p));
  col *= mix(0.5,1.0,vig);
  col += (hash(vUv*uRes.xy*0.35+uTime*55.0)-0.5)*0.032;
  frag = vec4(col,1.0);
}`;

export function bootScene6(root) {
  const section = root.querySelector('[data-s6]');
  const canvas = root.querySelector('[data-s6-canvas]');
  const quote = root.querySelector('[data-s6-quote]');
  const row = root.querySelector('[data-s6-row]');
  if (!section || !canvas) return;

  const gl = createGL(canvas);
  const plateProg = program(gl, FULLSCREEN_VS, PLATE_FS);
  const wordProg = program(gl, WORD_VS, WORD_FS);
  const buf = quad(gl);
  const embers = createEmbers(gl, 80);

  const wordCanvas = buildWordCanvas('AIHOPE', 300);
  const glowCanvas = buildGlowCanvas(wordCanvas);
  const wordTex = texFromImage(gl, wordCanvas);
  const glowTex = texFromImage(gl, glowCanvas);
  let grungeTex = null;
  const grungeImg = new Image();
  grungeImg.onload = () => { grungeTex = texFromImage(gl, grungeImg); };
  grungeImg.src = 'public/tex/grunge.png';

  const reduced = prefersReducedMotion();
  let running = false;

  function frame(now) {
    if (!running) return;
    fitCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const r = section.getBoundingClientRect();
    const p = reduced ? 1 : smoothstep(innerHeight * 0.9, innerHeight * 0.25, r.top);

    gl.disable(gl.BLEND);
    gl.useProgram(plateProg);
    bindQuad(gl, buf, plateProg);
    gl.uniform2f(gl.getUniformLocation(plateProg, 'uRes'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(plateProg, 'uTime'), now * 0.001);
    gl.uniform1f(gl.getUniformLocation(plateProg, 'uGlow'), 0.3 + p * 0.7);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (grungeTex) {
      const aspect = wordCanvas.width / wordCanvas.height;
      const canvasAspect = canvas.width / canvas.height;
      let sx = 0.6, sy = sx / aspect * canvasAspect;
      if (canvasAspect < 1) { sx = 0.88; sy = sx / aspect * canvasAspect; }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(wordProg);
      bindQuad(gl, buf, wordProg);
      gl.uniform2f(gl.getUniformLocation(wordProg, 'uScale'), sx, sy);
      gl.uniform2f(gl.getUniformLocation(wordProg, 'uOffset'), 0, 0.06);
      gl.uniform1f(gl.getUniformLocation(wordProg, 'uProgress'), p);
      gl.uniform2f(gl.getUniformLocation(wordProg, 'uGrungeRepeat'), 2.0, 1.4);
      gl.uniform3f(gl.getUniformLocation(wordProg, 'uGlowA'), 0.42, 0.33, 1.0);
      gl.uniform3f(gl.getUniformLocation(wordProg, 'uGlowB'), 0.16, 0.64, 1.0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, wordTex);
      gl.uniform1i(gl.getUniformLocation(wordProg, 'uWord'), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, glowTex);
      gl.uniform1i(gl.getUniformLocation(wordProg, 'uGlowTex'), 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, grungeTex);
      gl.uniform1i(gl.getUniformLocation(wordProg, 'uGrunge'), 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.enable(gl.BLEND);
    embers.draw(now * 0.001, { area: [1, 1], center: [0, -0.3], speed: 0.3, opacity: 0.35 + p * 0.35, hot: [0.55, 0.85, 1.0], cool: [0.5, 0.35, 1.0] });

    const capP = smoothstep(0.35, 1.0, p);
    quote.style.opacity = String(capP);
    quote.style.transform = `translateY(${(1 - capP) * 16}px)`;
    row.style.opacity = String(Math.max(capP, 0.001));
    row.style.transform = `translateY(${(1 - capP) * 10}px)`;

    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }, { threshold: 0 });
  io.observe(section);
}
