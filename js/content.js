/* ================================================================
   EVERGREEN — Dynamic content loader from _data/site.json
   Falls back silently to static HTML values if fetch fails.
   ================================================================ */
(async () => {
  try {
    const res = await fetch('_data/site.json?v=' + Date.now());
    if (!res.ok) return;
    const d = await res.json();

    const setText = (sel, val) => {
      if (!val) return;
      document.querySelectorAll(sel).forEach(el => { el.textContent = val; });
    };
    const setMeta = (sel, val) => {
      if (!val) return;
      document.querySelectorAll(sel).forEach(el => el.setAttribute('content', val));
    };

    // ── SEO ────────────────────────────────────────────────────────
    if (d.seo) {
      if (d.seo.title)       document.title = d.seo.title;
      setMeta('meta[name="description"]',          d.seo.description);
      setMeta('meta[name="keywords"]',             d.seo.keywords);
      setMeta('meta[property="og:title"]',         d.seo.title);
      setMeta('meta[property="og:description"]',   d.seo.description);
      setMeta('meta[name="twitter:title"]',        d.seo.title);
      setMeta('meta[name="twitter:description"]',  d.seo.description);
      if (d.seo.og_image) {
        setMeta('meta[property="og:image"]',       d.seo.og_image);
        setMeta('meta[name="twitter:image"]',      d.seo.og_image);
      }
    }

    // ── Hero ───────────────────────────────────────────────────────
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

    // ── CTA ────────────────────────────────────────────────────────
    if (d.cta) {
      setText('.cta-question', d.cta.question);
      setText('.cta-headline', d.cta.headline);
    }

    // ── Contact ────────────────────────────────────────────────────
    if (d.contact) {
      setText('[data-phone]', d.contact.phone_display);
      setText('[data-hours]', d.contact.hours_weekday);
      if (d.contact.whatsapp_number) {
        const wa = 'https://wa.me/' + d.contact.whatsapp_number;
        document.querySelectorAll('a[href*="wa.me/"]').forEach(el => { el.href = wa; });
      }
    }

  } catch (_) { /* static fallback remains */ }
})();
