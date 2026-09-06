// Scene 4 — the project gallery. Twelve work-cards arranged with per-card
// depth: two are real shipped products (live screenshots, clickable through
// to the site), the rest are UI mockups rendered from tools/mockup-gen.html.
// One materialisation event brings the far row in first, each card resolving
// into focus with a soft zoom-out, then a small infinite dephased float takes
// over. Pointer moves the whole deck by depth and hovering a card lifts it
// while its siblings ease back.
import { createGL, program, quad, bindQuad, FULLSCREEN_VS, fitCanvas } from './lib/glutil.js';
import { createEmbers } from './lib/particles.js';
import { clamp, smoothstep, easeOutCubic, prefersReducedMotion } from './lib/ease.js';

const PLATE_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform vec2 uRes; uniform float uTime; out vec4 frag;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5453); }
void main(){
  vec2 p = vUv*2.0-1.0; p.x *= uRes.x/uRes.y;
  vec3 ink = vec3(0.018,0.02,0.03);
  float glow = exp(-length(p-vec2(0.0,-0.2))*1.1)*0.22;
  vec3 col = ink + glow*vec3(0.25,0.5,1.0);
  float vig = 1.0 - smoothstep(0.5,1.4,length(p));
  col *= mix(0.6,1.0,vig);
  col += (hash(vUv*uRes.xy*0.3+uTime*40.0)-0.5)*0.028;
  frag = vec4(col,1.0);
}`;

const PROJECTS = [
  { label: 'Web App', image: 'public/projects/p01_webapp.png' },
  { label: 'Mobile App', image: 'public/projects/p02_mobile.png' },
  { label: 'E-Commerce', image: 'public/projects/p03_ecommerce.png' },
  { label: 'Dashboard', image: 'public/projects/p04_dashboard.png' },
  { label: 'Landing Page', image: 'public/projects/p05_landing.png' },
  { label: 'Wingspro Holidays', sub: 'Travel & booking platform', image: 'public/projects/wingsproholidays.png', url: 'https://wingsproholidays.com' },
  { label: 'Questlix', sub: 'Education SaaS platform', image: 'public/projects/questlix.png', url: 'https://gaming-omega-two.vercel.app/' },
  { label: 'Marketplace', image: 'public/projects/p08_marketplace.png' },
  { label: 'Fintech App', image: 'public/projects/p09_fintech.png' },
  { label: 'Analytics Suite', image: 'public/projects/p10_analytics.png' },
  { label: 'Content Platform', image: 'public/projects/p11_content.png' },
  { label: 'Internal Tool', image: 'public/projects/p12_internal.png' },
];

function buildMockup(project, index) {
  const num = String(index + 1).padStart(2, '0');
  const shot = project.url
    ? `<a class="project-shot" href="${project.url}" target="_blank" rel="noopener noreferrer" style="background-image:url(${project.image})" aria-label="Open ${project.label} live site"></a>`
    : `<div class="project-shot" style="background-image:url(${project.image})"></div>`;
  const tag = project.sub
    ? `<span class="project-card-tag live"><b>${num} / ${project.label}</b><em>${project.sub}${project.url ? ' — live ↗' : ''}</em></span>`
    : `<span class="project-card-tag">${num} / ${project.label}</span>`;
  return shot + tag;
}

export function bootScene4(root) {
  const section = root.querySelector('[data-s4]');
  const canvas = root.querySelector('[data-s4-canvas]');
  const grid = root.querySelector('[data-s4-grid]');
  if (!section || !canvas) return;

  const gl = createGL(canvas);
  const plateProg = program(gl, FULLSCREEN_VS, PLATE_FS);
  const buf = quad(gl);
  const embers = createEmbers(gl, 50);

  const cards = PROJECTS.map((project, i) => {
    const el = document.createElement('article');
    el.className = 'project-card' + (project.url ? ' is-live' : '');
    const row = Math.floor(i / 4);
    const depth = row === 0 ? 0.4 : row === 1 ? 0.7 : 1.0;
    el.dataset.depth = String(depth);
    el.dataset.row = String(row);
    el.innerHTML = buildMockup(project, i);
    grid.appendChild(el);
    return el;
  });

  grid.addEventListener('pointerenter', (e) => {
    const card = e.target.closest('.project-card');
    if (!card) return;
    grid.classList.add('has-hover');
    cards.forEach((c) => c.classList.toggle('is-hovered', c === card));
  }, true);
  grid.addEventListener('pointerleave', (e) => {
    if (e.target !== grid) return;
    grid.classList.remove('has-hover');
    cards.forEach((c) => c.classList.remove('is-hovered'));
  });

  const reduced = prefersReducedMotion();
  let running = false;
  let matStart = null;
  let mouse = [0, 0];
  window.addEventListener('pointermove', (e) => {
    mouse = [(e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1];
  }, { passive: true });

  function frame(now) {
    if (!running) return;
    fitCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const r = section.getBoundingClientRect();
    const inView = smoothstep(innerHeight * 0.85, innerHeight * 0.35, r.top);
    if (inView > 0.05 && matStart === null) matStart = now;
    const localT = matStart === null ? 0 : (now - matStart) / 1000;

    gl.disable(gl.BLEND);
    gl.useProgram(plateProg);
    bindQuad(gl, buf, plateProg);
    gl.uniform2f(gl.getUniformLocation(plateProg, 'uRes'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(plateProg, 'uTime'), now * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    cards.forEach((el, i) => {
      const depth = parseFloat(el.dataset.depth);
      const row = parseInt(el.dataset.row, 10);
      const rowDelay = row * 0.15;
      const p = reduced ? 1 : clamp(easeOutCubic((localT - rowDelay) / 0.9), 0, 1);
      const floatY = Math.sin(now * 0.0009 + i * 1.3) * 5 * depth;
      const parX = mouse[0] * 14 * depth;
      const parY = mouse[1] * 10 * depth + floatY;
      const rise = (1 - p) * 46;
      const blur = (1 - p) * 6;
      const rot = (1 - p) * -6;
      el.style.transform = `translate(${parX}px, ${parY + rise}px) rotate(${rot}deg)`;
      el.style.filter = `blur(${blur}px)`;
      el.style.opacity = String(p);
      if (p > 0.55 && !el.classList.contains('filled')) el.classList.add('filled');
    });

    embers.draw(now * 0.001, { area: [1, 0.9], center: [0, -0.1], speed: 0.3, opacity: 0.28, hot: [0.5, 0.8, 1.0], cool: [0.45, 0.35, 1.0] });

    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) requestAnimationFrame(frame);
  }, { threshold: 0 });
  io.observe(section);
}
