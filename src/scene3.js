// Scene 3 — the timeline. Six milestone years sit along a descending rail.
// The cursor projects onto the polyline through the card centres, which gives
// a continuous 0..5 position; a clock hand (lagged with inertia) points at
// that continuum while the cards snap to its rounded value.
import { createGL, program, quad, bindQuad, FULLSCREEN_VS, fitCanvas } from './lib/glutil.js';
import { createEmbers } from './lib/particles.js';
import { clamp, smoothstep, prefersReducedMotion } from './lib/ease.js';
import { isLitePower } from './lib/device.js';

const PLATE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
out vec4 frag;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uRes.x/uRes.y;
  vec3 ink = vec3(0.025, 0.02, 0.03);
  float warm = exp(-length(p - vec2(0.0,0.5))*1.3) * 0.12;
  vec3 col = ink + warm*vec3(0.5,0.3,0.9);
  float vig = 1.0 - smoothstep(0.5,1.4,length(p));
  col *= mix(0.55,1.0,vig);
  col += (hash(vUv*uRes.xy*0.3+uTime*45.0)-0.5)*0.03;
  frag = vec4(col,1.0);
}`;

const RAIL_VS = `#version 300 es
in float aT;
uniform vec2 uPts[6];
uniform float uReveal;
out float vGlow;
vec2 catmull(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float t){
  float t2=t*t, t3=t2*t;
  return 0.5*((2.0*p1)+(-p0+p2)*t+(2.0*p0-5.0*p1+4.0*p2-p3)*t2+(-p0+3.0*p1-3.0*p2+p3)*t3);
}
void main(){
  float n = 5.0;
  float f = clamp(aT,0.0,0.999) * n;
  float i = floor(f);
  float t = fract(f);
  int i0 = int(max(i-1.0,0.0));
  int i1 = int(i);
  int i2 = int(min(i+1.0,5.0));
  int i3 = int(min(i+2.0,5.0));
  vec2 p = catmull(uPts[i0], uPts[i1], uPts[i2], uPts[i3], t);
  vGlow = step(aT, uReveal);
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = 4.0;
}`;
const RAIL_FS = `#version 300 es
precision highp float;
in float vGlow;
out vec4 frag;
void main(){
  vec2 uv = gl_PointCoord*2.0-1.0;
  float a = smoothstep(1.0,0.0,length(uv));
  vec3 col = vec3(0.95,0.6,0.5);
  frag = vec4(col*a*vGlow, a*vGlow*0.8);
}`;

const MILESTONES = [
  { y: '2021', t: 'Founded', d: 'AIHope opens its doors; first client project ships.' },
  { y: '2022', t: 'Mobile', d: 'Mobile practice launches alongside 10+ web builds.' },
  { y: '2023', t: 'Commerce & Cloud', d: 'E-commerce and cloud infrastructure join the stack.' },
  { y: '2024', t: '50+ Shipped', d: 'Fifty-plus projects delivered across web, mobile & commerce.' },
  { y: '2025', t: 'Design Systems', d: 'A dedicated UI/UX practice matures; retainers begin.' },
  { y: '2026', t: 'Today', d: 'A small studio with serious capability — still growing.' },
];

function layoutNodes(isPortrait) {
  const n = 6;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (isPortrait) {
      pts.push({ x: 0.16, y: 0.12 + t * 0.8 });
    } else {
      pts.push({ x: 0.08 + t * 0.84, y: 0.22 + Math.pow(t, 1.25) * 0.56 });
    }
  }
  return pts;
}

export function bootScene3(root) {
  const section = root.querySelector('[data-s3]');
  const canvas = root.querySelector('[data-s3-canvas]');
  const railWrap = root.querySelector('[data-s3-rail]');
  const clock = root.querySelector('[data-s3-clock]');
  const hand = root.querySelector('[data-s3-hand]');
  if (!section || !canvas) return;

  const lite = isLitePower();
  if (lite) section.classList.add('is-lite');
  let gl, plateProg, railProg, buf, embers, railBuf;
  const RN = 220;
  if (!lite) {
    gl = createGL(canvas);
    plateProg = program(gl, FULLSCREEN_VS, PLATE_FS);
    railProg = program(gl, RAIL_VS, RAIL_FS);
    buf = quad(gl);
    embers = createEmbers(gl, 60);
    const seeds = new Float32Array(RN);
    for (let i = 0; i < RN; i++) seeds[i] = i / (RN - 1);
    railBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, railBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  }

  const cards = MILESTONES.map((m, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'year-card';
    el.innerHTML = `<span class="year-num">${m.y}</span><h3>${m.t}</h3><p>${m.d}</p>`;
    railWrap.appendChild(el);
    return el;
  });

  const reduced = prefersReducedMotion();
  let isPortrait = matchMedia('(max-width: 780px)').matches;
  let nodes = layoutNodes(isPortrait);
  let uSmoothed = 0;
  let uTarget = 0;
  let pointerActive = false;
  let running = false;

  function placeCards() {
    isPortrait = matchMedia('(max-width: 780px)').matches;
    if (isPortrait) return; // CSS handles portrait stacking
    nodes = layoutNodes(false);
    cards.forEach((el, i) => {
      el.style.left = `${nodes[i].x * 100}%`;
      el.style.top = `${nodes[i].y * 100}%`;
    });
  }
  placeCards();
  window.addEventListener('resize', placeCards);

  function screenPt(n) { return [n.x * innerWidth, n.y * innerHeight]; }

  section.addEventListener('pointermove', (e) => {
    if (isPortrait) return;
    pointerActive = true;
    const r = section.getBoundingClientRect();
    const cx = e.clientX, cy = e.clientY - r.top;
    let best = { d: Infinity, u: 0 };
    for (let i = 0; i < 5; i++) {
      const a = screenPt(nodes[i]); const b = screenPt(nodes[i + 1]);
      const ay = nodes[i].y * section.offsetHeight, by = nodes[i + 1].y * section.offsetHeight;
      const ax = nodes[i].x * innerWidth, bx = nodes[i + 1].x * innerWidth;
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((cx - ax) * dx + (cy - ay) * dy) / len2;
      t = clamp(t, 0, 1);
      const px = ax + dx * t, py = ay + dy * t;
      const dist = Math.hypot(cx - px, cy - py);
      if (dist < best.d) best = { d: dist, u: i + t };
    }
    uTarget = best.u;
  });
  section.addEventListener('pointerleave', () => { pointerActive = false; });

  function frame(now) {
    if (!running) return;
    if (!lite) {
      fitCanvas(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - innerHeight;
    const sp = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    const reveal = smoothstep(0.05, 0.7, sp);

    if (!pointerActive && !reduced) uTarget = reveal * 5 * (0.5 + 0.5 * Math.sin(now * 0.00025));
    uSmoothed += (uTarget - uSmoothed) * (reduced ? 1 : 0.08);
    const active = clamp(Math.round(uSmoothed), 0, 5);
    cards.forEach((el, i) => el.classList.toggle('active', i === active));

    if (!lite) {
      gl.disable(gl.BLEND);
      gl.useProgram(plateProg);
      bindQuad(gl, buf, plateProg);
      gl.uniform2f(gl.getUniformLocation(plateProg, 'uRes'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(plateProg, 'uTime'), now * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (!isPortrait) {
      if (!lite) {
        const clip = nodes.map((n) => [n.x * 2 - 1, -(n.y * 2 - 1)]).flat();
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.useProgram(railProg);
        const aLoc = gl.getAttribLocation(railProg, 'aT');
        gl.bindBuffer(gl.ARRAY_BUFFER, railBuf);
        gl.enableVertexAttribArray(aLoc);
        gl.vertexAttribPointer(aLoc, 1, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(gl.getUniformLocation(railProg, 'uPts'), clip);
        gl.uniform1f(gl.getUniformLocation(railProg, 'uReveal'), reveal);
        gl.drawArrays(gl.POINTS, 0, RN);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }

      const clockRect = clock.getBoundingClientRect();
      const ccx = clockRect.left + clockRect.width / 2 - r.left;
      const ccy = clockRect.top + clockRect.height / 2 - r.top;
      const idx = Math.floor(clamp(uSmoothed, 0, 4.999));
      const t = uSmoothed - idx;
      const a = nodes[idx], b = nodes[idx + 1] || a;
      const tx = (a.x + (b.x - a.x) * t) * innerWidth - (r.left);
      const ty = (a.y + (b.y - a.y) * t) * section.offsetHeight;
      const angle = Math.atan2(ty - ccy, tx - ccx) * (180 / Math.PI);
      hand.style.transform = `rotate(${angle}deg)`;
      clock.style.opacity = String(reveal);
    }

    if (!lite) {
      embers.draw(now * 0.001, { area: [1, 1], center: [0, 0.2], speed: 0.35, opacity: 0.3 + reveal * 0.25, hot: [1, 0.7, 0.55], cool: [0.6, 0.3, 0.5] });
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
