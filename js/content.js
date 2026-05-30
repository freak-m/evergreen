/* ================================================================
   EVERGREEN — Dynamic content loader from _data/
   Falls back silently to static HTML values if fetch fails.
   ================================================================ */
(async () => {
  const setText = (sel, val) => {
    if (!val) return;
    document.querySelectorAll(sel).forEach(el => { el.textContent = val; });
  };
  const setMeta = (sel, val) => {
    if (!val) return;
    document.querySelectorAll(sel).forEach(el => el.setAttribute('content', val));
  };
  const setImg = (key, src) => {
    if (!src) return;
    document.querySelectorAll(`[data-photo="${key}"]`).forEach(el => {
      if (el.tagName === 'IMG') el.src = src;
    });
  };

  // ── SEO & Textos ───────────────────────────────────────────────
  try {
    const res = await fetch('_data/site.json?v=' + Date.now());
    if (res.ok) {
      const d = await res.json();

      if (d.seo) {
        if (d.seo.title) document.title = d.seo.title;
        setMeta('meta[name="description"]',         d.seo.description);
        setMeta('meta[name="keywords"]',            d.seo.keywords);
        setMeta('meta[property="og:title"]',        d.seo.title);
        setMeta('meta[property="og:description"]',  d.seo.description);
        setMeta('meta[name="twitter:title"]',       d.seo.title);
        setMeta('meta[name="twitter:description"]', d.seo.description);
        if (d.seo.og_image) {
          setMeta('meta[property="og:image"]',  d.seo.og_image);
          setMeta('meta[name="twitter:image"]', d.seo.og_image);
        }
      }

      if (d.hero) {
        setText('.hero-tagline', d.hero.tagline);
        const vals = document.querySelectorAll('.hero-stat-value');
        const labs = document.querySelectorAll('.hero-stat-label');
        [
          [d.hero.stat1_value, d.hero.stat1_label],
          [d.hero.stat2_value, d.hero.stat2_label],
          [d.hero.stat3_value, d.hero.stat3_label],
        ].forEach(([v, l], i) => {
          if (vals[i] && v) vals[i].textContent = v;
          if (labs[i] && l) labs[i].textContent = l;
        });
      }

      if (d.cta) {
        setText('.cta-question', d.cta.question);
        setText('.cta-headline', d.cta.headline);
      }

      if (d.contact) {
        setText('[data-phone]', d.contact.phone_display);
        setText('[data-hours]', d.contact.hours_weekday);
        if (d.contact.whatsapp_number) {
          const wa = 'https://wa.me/' + d.contact.whatsapp_number;
          document.querySelectorAll('a[href*="wa.me/"]').forEach(el => { el.href = wa; });
        }
      }

      if (d.analytics?.ga4_id) {
        const id = d.analytics.ga4_id.trim();
        if (id.startsWith('G-')) {
          const s1 = document.createElement('script');
          s1.async = true;
          s1.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
          document.head.appendChild(s1);
          const s2 = document.createElement('script');
          s2.textContent = 'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + id + '")';
          document.head.appendChild(s2);
        }
      }
    }
  } catch (_) {}

  // ── Fotos do Site ──────────────────────────────────────────────
  try {
    const res = await fetch('_data/photos.json?v=' + Date.now());
    if (res.ok) {
      const p = await res.json();

      if (p.identity) {
        setImg('logo', p.identity.logo);
        setImg('contact-mockup', p.identity.contact_mockup);
        if (p.identity.hero_bg) {
          const bg = document.querySelector('.hero-img-bg');
          if (bg) bg.style.backgroundImage = `url('${p.identity.hero_bg}')`;
        }
      }

      ['ba1', 'ba2', 'ba3'].forEach(k => {
        if (!p[k]) return;
        setImg(`${k}-before`, p[k].before);
        setImg(`${k}-after`,  p[k].after);
      });

      if (p.portfolio) {
        ['taludes', 'industrial', 'urbanas', 'erosao'].forEach(k => {
          setImg(`portfolio-${k}`, p.portfolio[k]);
        });
      }

      if (p.process) {
        [1, 2, 3, 4].forEach(n => setImg(`process-${n}`, p.process[`step${n}`]));
      }

      if (p.insumos) {
        ['fertilizantes', 'sementes', 'mulches', 'fixadores', 'fibra'].forEach(k => {
          setImg(`insumo-${k}`, p.insumos[k]);
        });
      }
    }
  } catch (_) {}

  // ── Álbum — Galeria de Fotos ───────────────────────────────────
  try {
    const res = await fetch('gallery.json?v=' + Date.now());
    if (res.ok) {
      const g = await res.json();
      const pinMap = { antes: 'pin-yellow', aplicacao: 'pin-blue', resultado: 'pin-green' };

      Object.entries(pinMap).forEach(([key, pin]) => {
        const col = document.querySelector(`[data-gallery-phase="${key}"]`);
        if (!col || !Array.isArray(g[key])) return;
        col.innerHTML = '';
        g[key].forEach(({ image, label }) => {
          const item     = document.createElement('div');
          item.className = 'gallery-item';
          const pushpin  = document.createElement('div');
          pushpin.className = `pushpin ${pin}`;
          const frame    = document.createElement('div');
          frame.className = 'photo-frame';
          const img      = document.createElement('img');
          img.src        = image;
          img.alt        = label || '';
          img.loading    = 'lazy';
          const lbl      = document.createElement('div');
          lbl.className   = 'photo-label';
          lbl.textContent = label || '';
          frame.append(img, lbl);
          item.append(pushpin, frame);
          col.append(item);
        });
      });

      window.observeAnimTargets?.();
    }
  } catch (_) {}
})();
