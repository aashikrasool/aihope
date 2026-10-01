import { bootScene1 } from './scene1.js';
import { bootScene4 } from './scene4.js';
import { bootScene6 } from './scene6.js';
import { bootJourney } from './journey.js';
import { prefersReducedMotion } from './lib/ease.js';

function bootChrome() {
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    const setOpen = (open) => {
      mobileMenu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuBtn.addEventListener('click', () => setOpen(!mobileMenu.classList.contains('open')));
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) { setOpen(false); menuBtn.focus(); }
    });
  }

  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}

// Static blocks rise in as they enter the viewport. The hidden state only
// exists once this adds .reveal, so the page stays readable without JS.
const REVEAL = '.section-head, .about-statement, .about-collage, .about-item, .cap-card, .process-media, .process-row, .why-card, .contact-grid > *, .section-cta, '
  + '.founder-grid > *, .profile-grid, .expertise-card, .founder-quote';

function bootReveal() {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll(REVEAL).forEach((el) => {
    el.classList.add('reveal');
    io.observe(el);
  });
}

// Each scene owns its own WebGL context; a failure creating or compiling one
// (blocked GPU, driver quirk, context limit) must not take the rest of the
// page down with it.
function safeBoot(fn) {
  try { fn(document); } catch (err) { console.error(err); }
}

// The wordmark is rasterised to a canvas, so its face has to be loaded first.
Promise.all([document.fonts.load('800 1em "Bricolage Grotesque"'), document.fonts.ready]).finally(() => {
  bootChrome();
  bootReveal();
  safeBoot(bootScene1);
  safeBoot(bootScene4);
  safeBoot(bootScene6);
  safeBoot(bootJourney);
});
