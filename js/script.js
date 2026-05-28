/* ================================================================
   EVERGREEN GRAMAVERDE — SKEUOMORPHIC EDITION
   ================================================================ */

// ── Navbar burger ──────────────────────────────────────────────
const burger  = document.querySelector('.nav-burger');
const navMenu = document.querySelector('.nav-menu');

burger?.addEventListener('click', () => {
  const open = navMenu.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
});

// fecha o menu ao clicar fora
document.addEventListener('click', e => {
  if (!e.target.closest('.navbar')) {
    navMenu.classList.remove('open');
    burger?.classList.remove('open');
    burger?.setAttribute('aria-expanded', 'false');
  }
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    burger?.classList.remove('open');
    burger?.setAttribute('aria-expanded', 'false');
  });
});

// ── Smooth scroll with navbar offset ───────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  });
});

// ── Swiper — Portfolio ──────────────────────────────────────────
new Swiper('.portfolio-swiper', {
  slidesPerView: 1,
  spaceBetween: 28,
  loop: true,
  centeredSlides: true,
  autoplay: { delay: 3000, disableOnInteraction: false },
  speed: 300,
  pagination: { el: '.portfolio-swiper .swiper-pagination', clickable: true },
  navigation: { prevEl: '.portfolio-swiper .swiper-button-prev', nextEl: '.portfolio-swiper .swiper-button-next' },
  breakpoints: { 800: { slidesPerView: 1.18 }, 1100: { slidesPerView: 1.48 } },
});

// ── Lightbox (gallery + before/after) ──────────────────────────
const lightbox  = document.getElementById('lightbox');
const lbImg     = document.getElementById('lightbox-img');
const lbOverlay = document.getElementById('lightbox-overlay');
const lbClose   = document.getElementById('lb-close');
const lbPrev    = document.getElementById('lb-prev');
const lbNext    = document.getElementById('lb-next');

let lbImages  = [];
let lbCurrent = 0;

function lbAnimate(cls, done) {
  lbImg.classList.remove('lb-opening', 'lb-out-left', 'lb-out-right', 'lb-in-left', 'lb-in-right');
  lbImg.classList.add(cls);
  lbImg.addEventListener('animationend', done, { once: true });
}

function openLb(images, i) {
  lbImages  = images;
  lbCurrent = i;
  lbImg.src = images[i].src;
  lbImg.alt = images[i].alt;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
  lbImg.classList.remove('lb-opening', 'lb-out-left', 'lb-out-right', 'lb-in-left', 'lb-in-right');
  lbImg.classList.add('lb-opening');
}

function closeLb() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function navigateLb(dir) {
  const next = (lbCurrent + dir + lbImages.length) % lbImages.length;
  const outCls = dir > 0 ? 'lb-out-left'  : 'lb-out-right';
  const inCls  = dir > 0 ? 'lb-in-right'  : 'lb-in-left';
  lbAnimate(outCls, () => {
    lbCurrent = next;
    lbImg.src = lbImages[next].src;
    lbImg.alt = lbImages[next].alt;
    lbImg.classList.remove(outCls);
    lbImg.classList.add(inCls);
  });
}

// hook gallery items — navegação linha × coluna (pula células vazias)
const galleryPhases   = [...document.querySelectorAll('.gallery-phase')];
const galleryRowCount = Math.max(...galleryPhases.map(p => p.querySelectorAll('.gallery-item').length));

const orderedGalleryImages = [];
const galleryItemIndexMap  = new Map();

for (let row = 0; row < galleryRowCount; row++) {
  for (const phase of galleryPhases) {
    const item = phase.querySelectorAll('.gallery-item')[row];
    if (!item || item.classList.contains('gallery-item--empty')) continue;
    const img = item.querySelector('img');
    if (!img) continue;
    galleryItemIndexMap.set(item, orderedGalleryImages.length);
    orderedGalleryImages.push({ src: img.src, alt: img.alt || '' });
  }
}

galleryPhases.forEach(phase =>
  phase.querySelectorAll('.gallery-item:not(.gallery-item--empty)').forEach(item =>
    item.addEventListener('click', () => {
      const idx = galleryItemIndexMap.get(item);
      if (idx !== undefined) openLb(orderedGalleryImages, idx);
    })
  )
);

// hook before/after cards
const baCards  = [...document.querySelectorAll('.ba-card')];
const baImages = baCards.map(el => {
  const img = el.querySelector('img');
  return { src: img?.src, alt: img?.alt || '' };
});
baCards.forEach((el, i) => el.addEventListener('click', () => openLb(baImages, i)));

// controls
lbOverlay?.addEventListener('click', closeLb);
lbClose?.addEventListener('click', closeLb);
lbPrev?.addEventListener('click', () => navigateLb(-1));
lbNext?.addEventListener('click', () => navigateLb(1));
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape')     closeLb();
  if (e.key === 'ArrowLeft')  navigateLb(-1);
  if (e.key === 'ArrowRight') navigateLb(1);
});

// touch swipe
let lbTouchX = 0;
lightbox.addEventListener('touchstart', e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend',   e => {
  const dx = e.changedTouches[0].clientX - lbTouchX;
  if (Math.abs(dx) > 48) navigateLb(dx < 0 ? 1 : -1);
});

// mouse drag
let lbDragX = 0, lbDragging = false;
const lbImg2 = document.getElementById('lightbox-img');
lbImg2.addEventListener('mousedown', e => {
  lbDragging = true; lbDragX = e.clientX;
  lbImg2.style.cursor = 'grabbing';
  e.preventDefault();
});
window.addEventListener('mouseup', e => {
  if (!lbDragging) return;
  lbDragging = false;
  lbImg2.style.cursor = 'grab';
  const dx = e.clientX - lbDragX;
  if (Math.abs(dx) > 48) navigateLb(dx < 0 ? 1 : -1);
});
window.addEventListener('mousemove', e => { if (lbDragging) e.preventDefault(); });

// ── Intersection Observer (fade-in-up) ─────────────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry, delay) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), delay * 80);
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll(
  '.gallery-item, .timeline-card, .index-card, .portfolio-card, .gauge-body, .contact-item'
).forEach(el => { el.classList.add('anim-target'); io.observe(el); });
