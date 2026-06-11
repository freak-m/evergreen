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
        if (d.seo.og_image) {
          setMeta('meta[property="og:image"]',  d.seo.og_image);
          setMeta('meta[name="twitter:image"]', d.seo.og_image);
        }

        const ldEl = document.getElementById('ld-json');
        if (ldEl) {
          try {
            const schema = JSON.parse(ldEl.textContent);
            const graph  = schema['@graph'] || [];
            const biz    = graph.find(n => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']]).includes('LocalBusiness'));
            if (biz) {
              if (d.seo.og_image) biz.image = d.seo.og_image;
              if (d.seo.business) {
                const b = d.seo.business;
                if (b.name) {
                  biz.name = b.name;
                  const ws = graph.find(n => n['@type'] === 'WebSite');
                  if (ws) ws.name = b.name;
                }
                if (b.telephone) {
                  biz.telephone = b.telephone;
                  if (biz.contactPoint) biz.contactPoint.telephone = b.telephone;
                  biz.sameAs = ['https://wa.me/' + b.telephone.replace(/\D/g, '')];
                }
                if (b.email)       biz.email      = b.email;
                if (b.url)         biz.url        = b.url;
                if (b.price_range) biz.priceRange = b.price_range;
                if (!biz.address)  biz.address    = { '@type': 'PostalAddress', addressCountry: 'BR' };
                if (b.street_address)   biz.address.streetAddress   = b.street_address;
                if (b.address_locality) biz.address.addressLocality = b.address_locality;
                if (b.address_region)   biz.address.addressRegion   = b.address_region;
                if (b.postal_code)      biz.address.postalCode      = b.postal_code;
              }
              if (d.seo.area_served) {
                biz.areaServed = d.seo.area_served
                  .split(',').map(s => s.trim()).filter(Boolean)
                  .map(name => ({ '@type': 'City', name }));
              }
            }
            if (Array.isArray(d.seo.faq) && d.seo.faq.length > 0) {
              let faqNode = graph.find(n => n['@type'] === 'FAQPage');
              if (!faqNode) { faqNode = { '@type': 'FAQPage' }; graph.push(faqNode); }
              faqNode.mainEntity = d.seo.faq
                .filter(f => f.q && f.a)
                .map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }));
            }
            ldEl.textContent = '\n  ' + JSON.stringify(schema, null, 2) + '\n  ';
          } catch (_) {}
        }
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

      if (d.insumos) {
        const INSUMO_KEYS = ['fertilizantes', 'sementes', 'mulches', 'fixadores', 'fibra'];
        INSUMO_KEYS.forEach(k => {
          const item = d.insumos[k];
          if (!item) return;
          setImg(`insumo-${k}`, item.src);
          document.querySelectorAll(`[data-insumo="${k}"] h3`).forEach(el => { if (item.title) el.textContent = item.title; });
          document.querySelectorAll(`[data-insumo="${k}"] p`).forEach(el => { if (item.text)  el.textContent = item.text;  });
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

      // ── WhatsApp click tracking ─────────────────────────────────
      const workerUrl = (d.integrations?.worker_url || '').trim();
      if (workerUrl) {
        document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
          a.addEventListener('click', () => {
            fetch(workerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: 'wa' }),
              keepalive: true,
            }).catch(() => {});
          });
        });

        // ── Time on page tracking ───────────────────────────────
        const _pageStart = Date.now();
        let _lastPing    = 0;
        const _postTime  = (secs) => fetch(workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'time', value: secs }),
          keepalive: true,
        }).catch(() => {});

        // Periodic ping every 30 s while page is visible
        setInterval(() => {
          if (document.visibilityState === 'hidden') return;
          const secs = Math.round((Date.now() - _pageStart) / 1000);
          if (secs - _lastPing < 30) return;
          _lastPing = secs;
          _postTime(secs);
        }, 30000);

        // Final ping on exit
        const _sendTime = () => {
          const secs = Math.round((Date.now() - _pageStart) / 1000);
          if (secs < 5) return;
          _postTime(secs);
        };
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') _sendTime(); });
        window.addEventListener('pagehide', _sendTime);
      }

      if (d.footer) {
        setText('#footer-location', d.footer.location);
        setText('#footer-hours',    d.footer.hours);
      }

      if (d.sobre) {
        const leadEl = document.getElementById('sobre-lead');
        if (leadEl && d.sobre.lead) leadEl.textContent = d.sobre.lead;
        const bodyEl = document.getElementById('sobre-body');
        if (bodyEl && d.sobre.body) bodyEl.innerHTML = d.sobre.body;
      }

      if (d.processo) {
        const subEl = document.getElementById('processo-subtitle');
        if (subEl && d.processo.subtitle) subEl.textContent = d.processo.subtitle;
        [1, 2, 3, 4].forEach(n => {
          const step = d.processo[`step${n}`];
          if (!step) return;
          if (step.src) setImg(`process-${n}`, step.src);
          document.querySelectorAll(`[data-process="${n}"] h3`).forEach(el => { if (step.title) el.textContent = step.title; });
          document.querySelectorAll(`[data-process="${n}"] p`).forEach(el  => { if (step.text)  el.textContent = step.text;  });
        });
      }

      if (d.portfolio) {
        ['taludes', 'industrial', 'urbanas', 'erosao'].forEach(k => {
          const item = d.portfolio[k];
          if (!item) return;
          if (item.src) setImg(`portfolio-${k}`, item.src);
          document.querySelectorAll(`[data-portfolio="${k}"] h3`).forEach(el => { if (item.title) el.textContent = item.title; });
          document.querySelectorAll(`[data-portfolio="${k}"] p`).forEach(el  => { if (item.text)  el.textContent = item.text;  });
        });
      }

      // ── Integrations (GA4, Meta Pixel — from content.json) ──────
      if (d.integrations) {
        const gaId = (d.integrations.google_analytics || '').trim();
        if (gaId.startsWith('G-')) {
          const s1 = document.createElement('script');
          s1.async = true;
          s1.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
          document.head.appendChild(s1);
          const s2 = document.createElement('script');
          s2.textContent = 'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + gaId + '")';
          document.head.appendChild(s2);
        }

        const pixelId = (d.integrations.meta_pixel || '').trim();
        if (pixelId) {
          const s = document.createElement('script');
          s.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
          document.head.appendChild(s);
        }

        const metaVerify = (d.integrations.meta_verify || '').trim();
        if (metaVerify) {
          const m = document.createElement('meta');
          m.name = 'facebook-domain-verification';
          m.content = metaVerify;
          document.head.appendChild(m);
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
