import { bootScene1 } from './scene1.js';
import { bootScene2 } from './scene2.js';
import { bootScene3 } from './scene3.js';
import { bootScene4 } from './scene4.js';
import { bootScene6 } from './scene6.js';

function bootChrome() {
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', mobileMenu.classList.contains('open') ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}

// Each scene owns its own WebGL context; a failure creating or compiling one
// (blocked GPU, driver quirk, context limit) must not take the rest of the
// page down with it.
function safeBoot(fn) {
  try { fn(document); } catch (err) { console.error(err); }
}

document.fonts.ready.finally(() => {
  bootChrome();
  safeBoot(bootScene1);
  safeBoot(bootScene2);
  safeBoot(bootScene3);
  safeBoot(bootScene4);
  safeBoot(bootScene6);
});
