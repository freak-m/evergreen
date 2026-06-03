/* ================================================================
   EVERGREEN — Dynamic content loader from content.json
   Falls back silently to static HTML values if fetch fails.
   ================================================================ */
(async () => {
  const setText = (sel, val) => {
    if (!val) return;
    document.querySelectorAll(sel).forEach(el => { el.textContent = val; });
  };
  const setHTML = (sel, val) => {
    if (!val) return;
    const el = document.querySelector(sel);
    if (el) el.innerHTML = val;
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

  // ── Content JSON (CMS) ─────────────────────────────────────────
  try {
    const res = await fetch('content.json?v=' + Date.now());
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
      }

      if (d.antes_depois) {
        if (d.antes_depois.title) setText('#antes-depois-title', d.antes_depois.title);
        setHTML('#antes-depois-intro', d.antes_depois.intro);
        if (Array.isArray(d.antes_depois.pairs)) {
          d.antes_depois.pairs.forEach((p, i) => {
            const n = i + 1;
            setImg(`ba${n}-before`, p.before_src);
            setImg(`ba${n}-after`,  p.after_src);
          });
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
        const container = document.getElementById('contact-cards');
        if (container && Array.isArray(d.contact.cards)) {
          renderContactCards(container, d.contact.cards);
        }

        setHTML('#wa-panel-label', d.contact.wa_panel_label);
        setHTML('#wa-panel-sub',   d.contact.wa_panel_sub);

        const waCard = (d.contact.cards || []).find(c => c.type === 'whatsapp');
        if (waCard?.link) {
          const waHref = 'https://wa.me/' + waCard.link;
          document.querySelectorAll('a[href*="wa.me/"]').forEach(a => { a.href = waHref; });
          const dispEl = document.getElementById('footer-whatsapp-display');
          if (dispEl) dispEl.textContent = waCard.display || waCard.link;
          const fwLink = document.getElementById('footer-whatsapp');
          if (fwLink) fwLink.href = waHref;
        }
      }

      if (d.footer) {
        setText('#footer-location', d.footer.location);
        setText('#footer-hours',    d.footer.hours);
      }
    }
  } catch (_) {}

  // ── Analytics (read from _data/site.json) ─────────────────────
  try {
    const res = await fetch('_data/site.json?v=' + Date.now());
    if (res.ok) {
      const d = await res.json();
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

  // ── Photos ─────────────────────────────────────────────────────
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

  // ── Gallery ────────────────────────────────────────────────────
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

function renderContactCards(container, cards) {
  const icons = {
    whatsapp: '<i class="fab fa-whatsapp"></i>',
    phone:    '<i class="fas fa-phone"></i>',
    telegram: '<i class="fab fa-telegram-plane"></i>',
    email:    '<i class="fas fa-envelope"></i>',
    area:     '<i class="fas fa-map-marker-alt"></i>',
    hours:    '<i class="fas fa-clock"></i>',
    other:    '<i class="fas fa-info-circle"></i>'
  };
  const titles = {
    whatsapp: 'WhatsApp',
    phone:    'Telefone',
    telegram: 'Telegram',
    email:    'E-mail',
    area:     'Área de Atendimento',
    hours:    'Horário',
    other:    'Contato'
  };

  container.innerHTML = cards.map(card => {
    const icon  = icons[card.type] || icons.other;
    const title = titles[card.type] || titles.other;
    let content = '';

    switch (card.type) {
      case 'whatsapp':
        content = card.link
          ? `<a href="https://wa.me/${card.link}" target="_blank" rel="noopener">${card.display || card.link}</a>`
          : (card.display || '');
        break;
      case 'telegram':
        content = card.link
          ? `<a href="https://t.me/${card.link}" target="_blank" rel="noopener">${card.display || card.link}</a>`
          : (card.display || '');
        break;
      case 'email':
        content = card.link
          ? `<a href="mailto:${card.link}">${card.display || card.link}</a>`
          : (card.display || '');
        break;
      case 'hours':
        content = card.text || '';
        if (card.note) content += `<br><small style="opacity:.7">${card.note}</small>`;
        break;
      default:
        content = card.display || card.text || '';
    }

    return `<div class="contact-item visible">
      <div class="contact-icon-wrap">${icon}</div>
      <div><h3>${title}</h3><p>${content}</p></div>
    </div>`;
  }).join('');
}
