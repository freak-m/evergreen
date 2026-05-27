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
  pagination: { el: '.portfolio-swiper .swiper-pagination', clickable: true },
  navigation: { prevEl: '.portfolio-swiper .swiper-button-prev', nextEl: '.portfolio-swiper .swiper-button-next' },
  breakpoints: { 800: { slidesPerView: 1.18 }, 1100: { slidesPerView: 1.48 } },
});

// ── Gallery Lightbox ────────────────────────────────────────────
const lightbox   = document.getElementById('lightbox');
const lbImg      = document.getElementById('lightbox-img');
const lbOverlay  = document.getElementById('lightbox-overlay');
const lbClose    = document.getElementById('lb-close');
const lbPrev     = document.getElementById('lb-prev');
const lbNext     = document.getElementById('lb-next');

const galleryItems = [...document.querySelectorAll('.gallery-item')];
const images = galleryItems.map(item => {
  const img = item.querySelector('img');
  return { src: img?.src, alt: img?.alt || '' };
});
let current = 0;

function openLb(i) {
  current = i;
  lbImg.src = images[i].src;
  lbImg.alt = images[i].alt;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLb() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}
function showLb(i) {
  current = (i + images.length) % images.length;
  lbImg.src = images[current].src;
  lbImg.alt = images[current].alt;
}

galleryItems.forEach((item, i) => item.addEventListener('click', () => openLb(i)));
lbOverlay?.addEventListener('click', closeLb);
lbClose?.addEventListener('click', closeLb);
lbPrev?.addEventListener('click',  () => showLb(current - 1));
lbNext?.addEventListener('click',  () => showLb(current + 1));
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape')      closeLb();
  if (e.key === 'ArrowLeft')   showLb(current - 1);
  if (e.key === 'ArrowRight')  showLb(current + 1);
});

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
  '.partner-card, .gallery-item, .timeline-card, .index-card, .portfolio-card, .gauge-body, .contact-item'
).forEach(el => { el.classList.add('anim-target'); io.observe(el); });
