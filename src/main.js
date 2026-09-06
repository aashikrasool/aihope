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

document.fonts.ready.finally(() => {
  bootChrome();
  bootScene1(document);
  bootScene2(document);
  bootScene3(document);
  bootScene4(document);
  bootScene6(document);
});
