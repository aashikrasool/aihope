// Scene 2 — capabilities constellation. Six service nodes arranged in a slow
// orbiting ring; a single materialisation event brings them in together as the
// section scrolls into view, then pointer + idle spin take over. A light
// ribbon threads through the ring once it has formed.
import { createGL, program, quad, bindQuad, FULLSCREEN_VS, fitCanvas } from './lib/glutil.js';
import { createEmbers } from './lib/particles.js';
import { clamp, smoothstep, easeOutBack, prefersReducedMotion } from './lib/ease.js';
import { isLitePower } from './lib/device.js';

const PLATE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uDolly;
out vec4 frag;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uRes.x / uRes.y;
  vec3 ink = vec3(0.02, 0.025, 0.04);
  float floorGlow = exp(-max(0.0, p.y + 0.9) * 2.2) * 0.35;
  float ring = smoothstep(0.02, 0.0, abs(length(p) - (0.55 + uDolly*0.15)));
  vec3 col = ink + floorGlow * vec3(0.2,0.5,0.9) + ring * vec3(0.3,0.55,1.0) * 0.15;
  float vig = 1.0 - smoothstep(0.5, 1.4, length(p));
  col *= mix(0.6, 1.0, vig);
  float grain = (hash(vUv * uRes.xy * 0.3 + uTime*50.0) - 0.5) * 0.03;
  col += grain;
  frag = vec4(col, 1.0);
}`;

const RIBBON_VS = `#version 300 es
in float aT;
uniform vec2 uPts[6];
uniform float uMat;
uniform float uCount;
out float vT;
vec2 catmull(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float t){
  float t2=t*t, t3=t2*t;
  return 0.5*((2.0*p1) + (-p0+p2)*t + (2.0*p0-5.0*p1+4.0*p2-p3)*t2 + (-p0+3.0*p1-3.0*p2+p3)*t3);
}
void main(){
  float n = 6.0;
  float f = aT * n;
  float i = floor(f);
  float t = fract(f);
  int i0 = int(mod(i - 1.0 + n, n));
  int i1 = int(mod(i, n));
  int i2 = int(mod(i + 1.0, n));
  int i3 = int(mod(i + 2.0, n));
  vec2 p = catmull(uPts[i0], uPts[i1], uPts[i2], uPts[i3], t);
  vT = aT;
  gl_Position = vec4(p * uMat, 0.0, 1.0);
  gl_PointSize = 5.0 * (0.6 + 0.4*sin(aT*40.0));
}`;
const RIBBON_FS = `#version 300 es
precision highp float;
in float vT;
uniform float uMat;
out vec4 frag;
void main(){
  vec2 uv = gl_PointCoord*2.0-1.0;
  float a = smoothstep(1.0,0.0,length(uv));
  vec3 col = mix(vec3(0.9,0.98,1.0), vec3(0.45,0.35,1.0), fract(vT*3.0));
  frag = vec4(col*a*uMat, a*uMat*0.85);
}`;

const SERVICES = [
  { t: 'Web Development', p: 'High-performance sites & web apps.' },
  { t: 'Mobile Apps', p: 'Native & cross-platform products.' },
  { t: 'E-Commerce', p: 'Stores, payments, growth flows.' },
  { t: 'UI / UX Design', p: 'Systems that feel inevitable.' },
  { t: 'Backend & Cloud', p: 'APIs that scale with you.' },
  { t: 'Support & Growth', p: 'We stay after launch.' },
];

function project(x, y, z, aspect) {
  const f = 1.6;
  const d = z + 3.2;
  return [(x * f) / d, ((y * f) / d) * aspect];
}

export function bootScene2(root) {
  const section = root.querySelector('[data-s2]');
  const canvas = root.querySelector('[data-s2-canvas]');
  const nodeWrap = root.querySelector('[data-s2-nodes]');
  if (!section || !canvas) return;

  const lite = isLitePower();
  if (lite) section.classList.add('is-lite');
  let gl, plateProg, ribbonProg, buf, embers, ribbonBuf;
  const RIB_N = 260;
  if (!lite) {
    gl = createGL(canvas);
    plateProg = program(gl, FULLSCREEN_VS, PLATE_FS);
    ribbonProg = program(gl, RIBBON_VS, RIBBON_FS);
    buf = quad(gl);
    embers = createEmbers(gl, 70);
    const ribbonSeeds = new Float32Array(RIB_N);
    for (let i = 0; i < RIB_N; i++) ribbonSeeds[i] = i / RIB_N;
    ribbonBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ribbonBuf);
    gl.bufferData(gl.ARRAY_BUFFER, ribbonSeeds, gl.STATIC_DRAW);
  }

  const nodes = SERVICES.map((s, i) => {
    const el = document.createElement('button');
    el.className = 'cap-node';
    el.type = 'button';
    el.innerHTML = `<span class="cap-node-index">0${i + 1}</span><h3>${s.t}</h3><p>${s.p}</p>`;
    nodeWrap.appendChild(el);
    return el;
  });

  const reduced = prefersReducedMotion();
  let running = false;
  let matGlobal = 0;

  function scrollProgress() {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - innerHeight;
    if (total <= 0) return 1;
    return clamp(-r.top / total, 0, 1);
  }

  let mouse = [0, 0];
  window.addEventListener('pointermove', (e) => {
    mouse = [(e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1];
  }, { passive: true });

  let matStart = null;

  function frame(now) {
    if (!running) return;
    if (!lite) {
      fitCanvas(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const sp = scrollProgress();
    const enterP = smoothstep(0.02, 0.35, sp);
    if (enterP > 0.02 && matStart === null) matStart = now;
    const localT = matStart === null ? 0 : (now - matStart) / 1000;
    const mat = reduced ? 1 : clamp(easeOutBack(clamp(localT / 1.1, 0, 1)), 0, 1.15);
    matGlobal = mat;
    const dolly = smoothstep(0.3, 1.0, sp);

    if (!lite) {
      gl.disable(gl.BLEND);
      gl.useProgram(plateProg);
      bindQuad(gl, buf, plateProg);
      gl.uniform2f(gl.getUniformLocation(plateProg, 'uRes'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(plateProg, 'uTime'), now * 0.001);
      gl.uniform1f(gl.getUniformLocation(plateProg, 'uDolly'), dolly);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    const spin = now * 0.00012 + sp * 1.4 + mouse[0] * 0.25;
    const pts2D = [];
    const depths = [];
    const vShift = innerHeight * 0.14;
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 1.05;
      const z = Math.sin(a) * 1.05;
      const y = Math.sin(a) * 0.62 + mouse[1] * 0.06;
      const [px, py] = project(x, y, z, aspect);
      pts2D.push(px, py - (2 * vShift) / innerHeight);
      depths.push(z);

      const scale = clamp(mat, 0, 1) * (0.6 + (z + 1.05) * 0.2);
      const screenX = (px * 0.5 + 0.5) * innerWidth;
      const screenY = (-py * 0.5 + 0.5) * innerHeight + vShift;
      const el = nodes[i];
      el.style.transform = `translate(-50%,-50%) translate(${screenX}px, ${screenY}px) scale(${scale.toFixed(3)})`;
      el.style.opacity = clamp(mat, 0, 1) * (0.5 + (z + 1.05) * 0.28);
      el.style.zIndex = String(100 + Math.round(z * 10));
    }

    if (!lite) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(ribbonProg);
      const aLoc = gl.getAttribLocation(ribbonProg, 'aT');
      gl.bindBuffer(gl.ARRAY_BUFFER, ribbonBuf);
      gl.enableVertexAttribArray(aLoc);
      gl.vertexAttribPointer(aLoc, 1, gl.FLOAT, false, 0, 0);
      gl.uniform2fv(gl.getUniformLocation(ribbonProg, 'uPts'), pts2D);
      gl.uniform1f(gl.getUniformLocation(ribbonProg, 'uMat'), clamp(mat, 0, 1));
      gl.drawArrays(gl.POINTS, 0, RIB_N);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      embers.draw(now * 0.001, {
        area: [1.0, 1.0], center: [0, 0.1], speed: 0.4, opacity: 0.35 + dolly * 0.3,
        hot: [0.55, 0.85, 1.0], cool: [0.5, 0.35, 1.0],
      });
    }

    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }, { threshold: 0 });
  io.observe(section);
}
