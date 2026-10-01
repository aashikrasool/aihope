// Journey timeline. The list is ordinary document flow; this only draws the
// centre line down to the reading position and lights each year as it passes.
import { clamp, prefersReducedMotion } from './lib/ease.js';

export function bootJourney(root) {
  const list = root.querySelector('[data-journey]');
  if (!list || prefersReducedMotion()) return;

  const items = [...list.querySelectorAll('.journey-item')];
  list.classList.add('is-live'); // from here CSS dims whatever is not .is-on yet

  let queued = false;
  function update() {
    queued = false;
    const mark = innerHeight * 0.62;
    const r = list.getBoundingClientRect();
    list.style.setProperty('--p', clamp((mark - r.top) / r.height, 0, 1).toFixed(4));
    items.forEach((el) => {
      const ir = el.getBoundingClientRect();
      el.classList.toggle('is-on', ir.top + ir.height / 2 < mark);
    });
  }
  function request() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}
