// js/inserat.js · Property-Detail rendern + Anfrage-Formular

import { supabase, FEATURE_KEYS } from './supabase.js';
import { fmt, escapeHtml, getQuery } from './main.js';

const featureMap = Object.fromEntries(FEATURE_KEYS.map(f => [f.code, f.label]));
const id = getQuery().id;
const wrap = document.getElementById('prop-content');

if (!id) {
  wrap.innerHTML = '<div class="empty-state"><p>Kein Inserat gefunden.</p></div>';
} else {
  loadProperty();
}

async function loadProperty() {
  const { data: p, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !p) {
    wrap.innerHTML = '<div class="empty-state"><h3>Inserat nicht gefunden</h3><p>Es wurde möglicherweise gelöscht.</p></div>';
    return;
  }

  document.title = `${p.title || 'Inserat'} – immodays`;

  const imgs = Array.isArray(p.images) && p.images.length ? p.images
             : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=70'];
  const tag = p.listing_type === 'rent' ? 'Zur Miete' : 'Zum Kauf';
  const features = Array.isArray(p.features) ? p.features : [];
  const sourceNote = p.source && p.source !== 'immodays'
    ? `<div class="alert alert-info" style="margin-bottom:16px">Quelle: ${escapeHtml(p.source)}${p.source_url ? ` · <a href="${escapeHtml(p.source_url)}" target="_blank" rel="noopener noreferrer">Original-Inserat</a>` : ''}</div>`
    : '';

  wrap.innerHTML = `
    <div class="prop-gallery">
      ${imgs.slice(0, 5).map((src, i) => `
        <div${i === 4 && imgs.length > 5 ? ' class="more"' : ''}>
          <img src="${escapeHtml(src)}" alt="" loading="lazy" />
          ${i === 4 && imgs.length > 5 ? `<span>+${imgs.length - 5} Fotos</span>` : ''}
        </div>`).join('')}
    </div>

    <div class="prop-layout">
      <div class="prop-head">
        ${sourceNote}
        <span class="card-tag${p.listing_type === 'buy' ? ' is-gold' : ''}" style="position:static;display:inline-block">${tag}</span>
        <h1>${escapeHtml(p.title || '')}</h1>
        <div class="prop-loc">${escapeHtml([p.district, p.city, p.country].filter(Boolean).join(', '))}${p.address_visibility === 'on_request' ? ' · <span class="muted">Adresse auf Anfrage</span>' : ''}</div>

        <div class="prop-keys">
          <div class="prop-key"><b>${fmt.price(p.price, p.currency || 'EUR')}</b><span>Preis</span></div>
          ${p.rooms ? `<div class="prop-key"><b>${p.rooms}</b><span>Zimmer</span></div>` : ''}
          ${p.living_area ? `<div class="prop-key"><b>${fmt.area(p.living_area)}</b><span>Wohnfläche</span></div>` : ''}
          ${p.plot_area ? `<div class="prop-key"><b>${fmt.area(p.plot_area)}</b><span>Grundstück</span></div>` : ''}
          ${p.year_built ? `<div class="prop-key"><b>${p.year_built}</b><span>Baujahr</span></div>` : ''}
          ${p.floor != null ? `<div class="prop-key"><b>${p.floor}</b><span>Etage</span></div>` : ''}
        </div>

        <section class="form-section">
          <h3>Beschreibung</h3>
          <p style="white-space:pre-line">${escapeHtml(p.description || 'Keine Beschreibung hinterlegt.')}</p>
        </section>

        ${features.length ? `
          <section class="form-section">
            <h3>Ausstattung</h3>
            <div class="tag-list">${features.map(f => `<span>${escapeHtml(featureMap[f] || f)}</span>`).join('')}</div>
          </section>` : ''}

        ${p.energy_class || p.energy_value || p.energy_carrier ? `
          <section class="form-section">
            <h3>Energie</h3>
            <div class="prop-keys" style="background:var(--c-cream)">
              ${p.energy_class ? `<div class="prop-key"><b>${escapeHtml(p.energy_class)}</b><span>Energieklasse</span></div>` : ''}
              ${p.energy_value ? `<div class="prop-key"><b>${fmt.number(p.energy_value)}</b><span>kWh/(m²·a)</span></div>` : ''}
              ${p.energy_carrier ? `<div class="prop-key"><b>${escapeHtml(p.energy_carrier)}</b><span>Energieträger</span></div>` : ''}
              ${p.energy_certificate ? `<div class="prop-key"><b>Ja</b><span>Ausweis vorhanden</span></div>` : ''}
            </div>
          </section>` : ''}

        ${p.listing_type === 'rent' && (p.additional_costs || p.heating_costs || p.deposit) ? `
          <section class="form-section">
            <h3>Kosten</h3>
            <div class="prop-keys" style="background:var(--c-cream)">
              <div class="prop-key"><b>${fmt.price(p.price, p.currency || 'EUR')}</b><span>Kaltmiete</span></div>
              ${p.additional_costs ? `<div class="prop-key"><b>${fmt.price(p.additional_costs, p.currency || 'EUR')}</b><span>Nebenkosten</span></div>` : ''}
              ${p.heating_costs ? `<div class="prop-key"><b>${fmt.price(p.heating_costs, p.currency || 'EUR')}</b><span>Heizkosten</span></div>` : ''}
              ${p.deposit ? `<div class="prop-key"><b>${fmt.price(p.deposit, p.currency || 'EUR')}</b><span>Kaution</span></div>` : ''}
            </div>
          </section>` : ''}
      </div>

      <!-- Kontakt-Card -->
      <aside class="contact-card">
        <div class="price">${fmt.price(p.price, p.currency || 'EUR')}${p.listing_type === 'rent' ? ' <small>/ Monat</small>' : ''}</div>
        <p class="muted" style="margin:4px 0 18px">${p.commission || 'Kontaktiere den Anbieter direkt über immodays.'}</p>

        ${p.source && p.source !== 'immodays'
          ? `<a class="btn btn-primary btn-block" href="${escapeHtml(p.source_url || '#')}" target="_blank" rel="noopener noreferrer">Zum Originalanbieter →</a>`
          : `
        <form id="inquiry-form">
          <div class="field" style="margin-bottom:10px">
            <label>Dein Name</label>
            <input type="text" name="from_name" required />
          </div>
          <div class="field" style="margin-bottom:10px">
            <label>E-Mail</label>
            <input type="email" name="from_email" required />
          </div>
          <div class="field" style="margin-bottom:10px">
            <label>Telefon (optional)</label>
            <input type="tel" name="from_phone" />
          </div>
          <div class="field" style="margin-bottom:14px">
            <label>Nachricht</label>
            <textarea name="message" rows="4" required placeholder="Hallo, ich interessiere mich für das Inserat…"></textarea>
          </div>
          <label style="display:flex;gap:10px;font-size:.85rem;color:var(--c-muted);margin-bottom:14px">
            <input type="checkbox" name="consent" required />
            <span>Ich willige ein, dass meine Angaben zur Bearbeitung der Anfrage an den Anbieter weitergegeben und gespeichert werden. <a href="datenschutz.html">Datenschutz</a></span>
          </label>
          <button class="btn btn-primary btn-block" type="submit">Anfrage senden</button>
          <div id="inquiry-msg" style="margin-top:12px"></div>
        </form>`}
      </aside>
    </div>`;

  const form = document.getElementById('inquiry-form');
  if (form) form.addEventListener('submit', e => sendInquiry(e, p.id));
}

async function sendInquiry(e, propertyId) {
  e.preventDefault();
  const form = e.target;
  const msg  = document.getElementById('inquiry-msg');
  const btn  = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Sende…';

  const fd = new FormData(form);
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('inquiries').insert({
    property_id: propertyId,
    from_user_id: user?.id || null,
    from_name:    fd.get('from_name'),
    from_email:   fd.get('from_email'),
    from_phone:   fd.get('from_phone') || null,
    message:      fd.get('message'),
    consent_data_processing: !!fd.get('consent'),
  });

  if (error) {
    msg.innerHTML = `<div class="alert alert-error">Fehler: ${escapeHtml(error.message)}</div>`;
    btn.disabled = false; btn.textContent = 'Anfrage senden';
    return;
  }
  msg.innerHTML = `<div class="alert alert-success">Anfrage gesendet. Der Anbieter meldet sich per E-Mail.</div>`;
  form.reset();
  btn.disabled = false; btn.textContent = 'Anfrage senden';
}
