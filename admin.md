# CMS Admin Panel — Template Guide for Claude

This document is a template guide for building a **GitHub-based CMS admin panel** for any static site.  
The panel requires no server, no database, and no backend — it uses the **GitHub Contents API** with a Personal Access Token (PAT) to read and write JSON files directly in the repository.

---

## 1. Architecture Overview

```
/admin/index.html      ← Self-contained single-file CMS
/content.json          ← Main content file (editable via admin)
/gallery.json          ← Gallery content (if needed, separate file)
/js/content.js         ← Public site reads content.json and applies it to the DOM
/img/                  ← Images (can be uploaded via admin)
```

**How it works:**
1. Admin loads → user pastes a GitHub PAT → admin fetches `content.json` via GitHub API
2. User edits fields → live preview iframe updates in real time
3. User clicks Publish → admin writes updated JSON back to GitHub via API
4. GitHub Pages / Netlify redeploys automatically (usually 1–5 minutes)

---

## 2. GitHub API Patterns

### Constants (always at the top of the script)
```javascript
const OWNER  = 'github-username';
const REPO   = 'repo-name';
const BRANCH = 'main';
const API    = 'https://api.github.com';
```

### Fetching a file
```javascript
const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/content.json?ref=${BRANCH}`, {
  headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
});
const file = await res.json();
const sha  = file.sha; // must be saved — required when writing back
const data = JSON.parse(atob(file.content.replace(/\n/g, '')));
```

> Always decode with `atob` + `replace(/\n/g,'')` since GitHub base64 includes newlines.  
> For Unicode content use: `JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g,'')))))` 

### Writing a file
```javascript
const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/content.json`, {
  method: 'PUT',
  headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
  body: JSON.stringify({
    message: 'CMS: update content',
    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    sha:     currentSha,   // required — obtained from the last fetch
    branch:  BRANCH
  })
});
const updated = await res.json();
currentSha = updated.content.sha; // update sha for next publish
```

### Uploading an image
```javascript
// Read file as data URL, extract base64, upload to img/ folder
const dataUrl = await fileToDataUrl(file);
const b64     = dataUrl.split(',')[1];
const path    = 'img/' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

// Check if file already exists (need SHA to overwrite)
let sha;
const chk = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, { headers });
if (chk.ok) sha = (await chk.json()).sha;

const body = { message: 'CMS: upload ' + file.name, content: b64, branch: BRANCH };
if (sha) body.sha = sha;

await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
```

---

## 3. Security Rules — Non-Negotiable

| Rule | Why |
|------|-----|
| Token stored ONLY in `sessionStorage` | Cleared when tab closes — never persists |
| NEVER in `localStorage` | Persists forever — security risk |
| NEVER written to HTML or JS files | Exposed in source code |
| Token used only in `Authorization` header | Standard GitHub API pattern |
| Admin page has `<meta name="robots" content="noindex, nofollow">` | Keeps it out of Google |

```javascript
// Save on login
sessionStorage.setItem('cms_token', token);

// Restore on page load
const saved = sessionStorage.getItem('cms_token');
if (saved) autoLogin(saved);

// Clear on logout
sessionStorage.removeItem('cms_token');
```

---

## 4. Content JSON Structure

Design `content.json` to mirror the site's sections. Each key maps directly to a DOM section.

```json
{
  "seo": {
    "title": "Page title for Google",
    "description": "Meta description (150–160 chars)",
    "keywords": "comma, separated, keywords",
    "og_image": "https://site.com/img/share.jpg",
    "business": {
      "name": "Company Name",
      "telephone": "+55-11-99999-9999",
      "email": "contact@site.com",
      "url": "https://site.com",
      "price_range": "$$",
      "street_address": "Rua Exemplo, 123",
      "address_locality": "City",
      "address_region": "SP",
      "postal_code": "00000-000"
    },
    "area_served": "City1, City2, City3",
    "faq": [
      { "q": "Question?", "a": "Answer." }
    ]
  },
  "hero": {
    "tagline": "Main headline",
    "stat1_value": "10", "stat1_label": "years experience"
  },
  "about": {
    "lead": "Short lead sentence.",
    "body": "<p>Rich text body...</p>"
  },
  "contact": {
    "cards": [
      { "type": "whatsapp", "display": "(11) 99999-9999", "link": "5511999999999" },
      { "type": "hours",    "text": "Mon–Fri: 9am–6pm", "note": "24h on-call" }
    ],
    "panel_label": "<p>Talk to our team</p>",
    "panel_sub":   "<p>Response within 2 hours</p>"
  },
  "footer": {
    "location": "City – ST",
    "hours": "Mon–Sat: 09h–18h"
  }
}
```

---

## 5. JavaScript Initialization Order — Critical Rule

**`const` arrays used inside the `init()` IIFE must be declared BEFORE the IIFE.**  
`const` is NOT hoisted — it will throw `ReferenceError` if declared after the IIFE that references it.

```javascript
// ✅ CORRECT ORDER
const SECTION_KEYS = [
  { k: 'key1', label: 'Label 1' },
  { k: 'key2', label: 'Label 2' },
];

(function init() {
  buildSectionAccordion(); // uses SECTION_KEYS — works because it's declared above
  // init Quill editors...
  // attach event listeners...
})();

// ❌ WRONG — will crash init()
(function init() {
  buildSectionAccordion(); // ReferenceError: SECTION_KEYS is not defined
})();

const SECTION_KEYS = [...]; // declared after IIFE — too late
```

---

## 6. Content Loader (`js/content.js`)

The public site loads `content.json` on every page view and applies values to the DOM.

```javascript
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

  try {
    const res = await fetch('content.json?v=' + Date.now());
    if (!res.ok) return;
    const d = await res.json();

    // SEO
    if (d.seo) {
      if (d.seo.title) document.title = d.seo.title;
      setMeta('meta[name="description"]',        d.seo.description);
      setMeta('meta[property="og:image"]',       d.seo.og_image);
      setMeta('meta[name="twitter:image"]',      d.seo.og_image);
      // Update JSON-LD schema dynamically (add id="ld-json" to the script tag)
      // updateJsonLd(d.seo);
    }

    // Sections — mirror your content.json structure
    if (d.hero)    { setText('.hero-tagline', d.hero.tagline); }
    if (d.about)   { setText('#about-lead', d.about.lead); setHTML('#about-body', d.about.body); }
    if (d.footer)  { setText('#footer-location', d.footer.location); }
  } catch (_) {}
})();
```

**Rule:** Every editable field in `content.json` needs a matching selector in `content.js`.

---

## 7. HTML Data Attributes Pattern

Use `data-*` attributes on site HTML so `content.js` can target elements without IDs:

```html
<!-- For repeated elements (e.g. product cards in a ticker) -->
<div data-product="item1">
  <h3>Default Title</h3>
  <p>Default description</p>
</div>

<!-- For photos (handles multiple img tags pointing to the same photo) -->
<img data-photo="hero-bg" src="img/hero.jpg" alt="">

<!-- For unique sections -->
<section id="about">
  <p id="about-lead">Default lead text</p>
  <div id="about-body"><p>Default body...</p></div>
</section>
```

Then in `content.js`:
```javascript
// Updates ALL elements with this attribute — works for duplicates in tickers/carousels
document.querySelectorAll('[data-product="item1"] h3').forEach(el => el.textContent = title);
document.querySelectorAll('[data-photo="hero-bg"]').forEach(img => img.src = src);
```

---

## 8. Live Preview Pattern

The admin embeds the site in an `<iframe>` and directly manipulates its DOM on every input change.

```javascript
// Debounce — wait 250ms after last keystroke before syncing
let syncTimer = null;
function scheduleSyncPreview() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncPreview, 250);
}

function syncPreview() {
  if (!previewReady) return;
  try {
    const doc = document.getElementById('preview-iframe').contentDocument;
    if (!doc?.body) return;

    const d = collectFormValues();

    // Apply changes directly to iframe DOM — same selectors as content.js
    const el = doc.querySelector('.hero-tagline');
    if (el) el.textContent = d.hero.tagline;
    // ... etc
  } catch (_) {} // Silently catch cross-origin or not-ready errors
}
```

**Section highlight on accordion open:**
```javascript
function scrollPreviewToSection(sectionId) {
  if (!previewReady) return;
  try {
    const doc     = document.getElementById('preview-iframe').contentDocument;
    const section = doc.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => doFlash(doc, section), 1100);
  } catch (_) {}
}

function doFlash(doc, section) {
  // Use position:absolute + pageYOffset to anchor overlay to the section,
  // not position:fixed which follows the viewport scroll
  const win = doc.defaultView;
  const r   = section.getBoundingClientRect();
  const top = r.top  + (win.pageYOffset || doc.documentElement.scrollTop);
  const left = r.left + (win.pageXOffset || doc.documentElement.scrollLeft);

  const ov = doc.createElement('div');
  ov.style.cssText = `position:absolute;top:${top}px;left:${left}px;width:${r.width}px;height:${r.height}px;border:4px solid #e53935;background:rgba(229,57,53,.15);border-radius:3px;pointer-events:none;z-index:99999;`;
  doc.body.appendChild(ov);
  // Blink animation, then switch to yellow "editing" ring...
}
```

---

## 9. Rich Text (Quill.js)

Use Quill 1.3.7 for fields that need bold/italic/headings (about body, intro texts, etc.).

```html
<link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
<script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
```

```javascript
// Declare variable before init
let quillAbout = null;

// Inside init()
quillAbout = new Quill('#quill-about-body', {
  theme: 'snow',
  placeholder: 'Body text…',
  modules: { toolbar: [['bold', 'italic'], [{ header: [3, false] }], ['clean']] }
});
quillAbout.on('text-change', scheduleSyncPreview);

// Read HTML from Quill
const html = quillAbout.root.innerHTML;

// Set HTML into Quill
quillAbout.root.innerHTML = '<p>Content here</p>';
```

---

## 10. Photo Fields Pattern

Every photo field needs three elements with a consistent key:

```html
<!-- key = "section-photo" -->
<div class="thumb-wrap" onclick="openLightbox(resolveImgSrc(document.getElementById('section-photo-src').value))">
  <img id="section-photo-thumb" class="thumb" alt="">
</div>
<div class="url-row">
  <input id="section-photo-src" type="text" oninput="updatePhotoThumb('section-photo')">
  <button type="button" onclick="changePhotoUrl('section-photo')">Trocar</button>
</div>
```

The **Trocar** button should open a native file picker and upload the file to GitHub:

```javascript
let _uploadTargetKey = null;

function changePhotoUrl(key) {
  _uploadTargetKey = key;
  document.getElementById('photo-file-input').click(); // hidden <input type="file">
}

// On file selected: show data URL preview immediately, then upload to GitHub
// After upload: update text field with 'img/filename.ext', keep data URL in thumb
// (the deployed URL won't be available for a few minutes after upload)
```

---

## 11. Dynamic List Editors (FAQ, Gallery, Contact Cards)

For any repeating list (FAQ pairs, gallery items, contact cards), use this pattern:

```javascript
function addItem(data) {
  data = data || { field1: '', field2: '' };
  const list = document.getElementById('items-list');
  const el   = document.createElement('div');
  el.className = 'list-item';
  el.innerHTML = `
    <input type="text" data-field="field1" value="${esc(data.field1)}">
    <textarea data-field="field2">${esc(data.field2)}</textarea>
    <button type="button" onclick="this.closest('.list-item').remove()">✕</button>`;
  list.appendChild(el);
}

function getItemsFromForm() {
  return Array.from(document.querySelectorAll('#items-list .list-item')).map(item => ({
    field1: item.querySelector('[data-field="field1"]').value.trim(),
    field2: item.querySelector('[data-field="field2"]').value.trim()
  })).filter(item => item.field1); // skip empty rows
}

// Populate on login
(data.items || []).forEach(item => addItem(item));

// Collect on publish
const items = getItemsFromForm();
```

---

## 12. `populateForm` / `collectFormValues` Pattern

Keep these two functions as the **single source of truth** for reading and writing form state.

```javascript
function populateForm(d) {
  // SEO
  sv('seo-title',       d.seo?.title       || '');
  sv('seo-description', d.seo?.description || '');

  // Photos
  sv('hero-bg-src', d.hero?.bg || '');
  updatePhotoThumb('hero-bg');

  // Rich text
  if (quillAbout) quillAbout.root.innerHTML = d.about?.body || '';

  // Dynamic lists
  document.getElementById('faq-list').innerHTML = '';
  (d.seo?.faq || []).forEach(item => addFaqItem(item));
}

function collectFormValues() {
  return {
    seo: {
      title:       gv('seo-title'),
      description: gv('seo-description'),
      faq:         getFaqFromForm()
    },
    hero: { bg: gv('hero-bg-src') },
    about: { body: quillAbout?.root.innerHTML || '' }
  };
}

// Helpers
function sv(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function gv(id)      { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function esc(s)      { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
```

---

## 13. Accordion Structure

Each section on the site maps to one accordion in the admin.  
The `data-section` attribute should match the `id` of the corresponding section in `index.html`.

```html
<div class="accordion-item" data-section="about">
  <div class="accordion-header" onclick="toggleAccordion(this)">
    <span>📄</span>
    <span class="accordion-title">About</span>
    <span class="accordion-arrow">▼</span>
  </div>
  <div class="accordion-body">
    <!-- fields for this section -->
  </div>
</div>
```

```javascript
function toggleAccordion(header) {
  const item   = header.closest('.accordion-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.accordion-item.open').forEach(a => a.classList.remove('open'));
  if (!isOpen) {
    item.classList.add('open');
    const sid = item.dataset.section;
    if (sid) scrollPreviewToSection(sid); // scrolls + highlights in preview
  }
}
```

---

## 14. JSON-LD Schema (SEO)

Add `id="ld-json"` to the site's JSON-LD script so `content.js` can update it dynamically:

```html
<script type="application/ld+json" id="ld-json">
{ "@context": "https://schema.org", "@graph": [ ... ] }
</script>
```

In `content.js`, update the LocalBusiness node and FAQPage node from `content.json`:

```javascript
const ldEl = document.getElementById('ld-json');
if (ldEl) {
  try {
    const schema = JSON.parse(ldEl.textContent);
    const graph  = schema['@graph'] || [];
    const biz    = graph.find(n => [n['@type']].flat().includes('LocalBusiness'));
    if (biz && d.seo?.business) {
      if (d.seo.business.telephone) biz.telephone = d.seo.business.telephone;
      // ... update other fields
    }
    if (d.seo?.faq?.length) {
      let faqNode = graph.find(n => n['@type'] === 'FAQPage');
      if (!faqNode) { faqNode = { '@type': 'FAQPage' }; graph.push(faqNode); }
      faqNode.mainEntity = d.seo.faq.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }));
    }
    ldEl.textContent = JSON.stringify(schema);
  } catch (_) {}
}
```

---

## 15. CSS Design System

Use CSS variables for consistent theming across the admin:

```css
:root {
  --accent:      #F5C400;   /* primary yellow */
  --accent-dark: #c49b00;   /* hover state */
  --bg-deep:     #111;      /* page background */
  --bg-dark:     #1a1a1a;   /* panels, sidebar */
  --bg-mid:      #222;      /* cards, inputs */
  --bg-light:    #2a2a2a;   /* hover states */
  --border:      #333;      /* dividers */
  --text:        #e8e8e8;   /* primary text */
  --text-dim:    #999;      /* labels, hints */
  --sidebar-w:   220px;
  --editor-w:    560px;     /* editor panel width */
}
```

---

## 16. Checklist for a New Project

- [ ] Create `content.json` with all editable content sections
- [ ] Add `id` and `data-*` attributes to all editable elements in `index.html`
- [ ] Add `id="ld-json"` to the JSON-LD script tag
- [ ] Write `js/content.js` to apply `content.json` to the DOM on every page load
- [ ] Copy `admin/index.html` template and update: `OWNER`, `REPO`, `BRANCH` constants
- [ ] Update accordion list to match site sections (`data-section` → `id` in HTML)
- [ ] Update `populateForm()` and `collectFormValues()` to match the new `content.json` shape
- [ ] Update `syncPreview()` to mirror `content.js` selectors
- [ ] Define all `const` arrays (`SECTION_KEYS`, etc.) **before** the `init()` IIFE
- [ ] Add favicon: `<link rel="icon" href="../img/logo.png">`
- [ ] Test: login → edit → see preview update → publish → verify on live site

---

## 17. Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| `const` array declared after `init()` IIFE | Move it above the IIFE |
| `img.src = ''` clears thumbnail | Use `img.removeAttribute('src')` |
| Flash overlay using `position:fixed` | Use `position:absolute` + `pageYOffset` |
| Token in `localStorage` | Always use `sessionStorage` |
| Calling `btoa()` on Unicode strings | Use `btoa(unescape(encodeURIComponent(str)))` |
| After image upload, loading path before deploy | Keep data URL preview, update only the text field |
| `<button>` inside `<form>` without `type="button"` | Add `type="button"` to all non-submit buttons |
| Syncing SEO meta tags in preview (invisible) | Skip — no visual benefit in iframe preview |
