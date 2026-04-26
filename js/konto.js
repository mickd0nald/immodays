// js/konto.js · Dashboard mit Listings, Anfragen, Favoriten, Profil

import { supabase } from './supabase.js';
import { fmt, escapeHtml } from './main.js';
import { requireAuth } from './auth.js';

const session = await requireAuth();
if (!session) { /* redirected */ } else { boot(); }

function boot() {
  const user = session.user;
  document.querySelector('#hello b').textContent = user.email;

  // Tabs
  const tabs  = document.querySelectorAll('[data-tab]');
  const panes = document.querySelectorAll('[data-pane]');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.toggle('is-active', x === t));
    panes.forEach(p => p.hidden = p.dataset.pane !== t.dataset.tab);
    if (t.dataset.tab === 'listings')  loadListings();
    if (t.dataset.tab === 'inquiries') loadInquiries();
    if (t.dataset.tab === 'favorites') loadFavorites();
    if (t.dataset.tab === 'profile')   loadProfile();
  }));

  loadListings();
  initProfileForm();
}

// ---- Listings -------------------------------------------
async function loadListings() {
  const wrap = document.getElementById('my-listings');
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, city, country, price, currency, listing_type, status, images, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }
  if (!data.length) {
    wrap.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <h3>Noch keine Inserate</h3>
        <p>Lege jetzt dein erstes kostenloses Inserat an.</p>
        <a href="inserieren.html" class="btn btn-primary" style="margin-top:14px">+ Neues Inserat</a>
      </div>`;
    return;
  }
  wrap.innerHTML = data.map(p => {
    const img = (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=70';
    return `
      <div class="card">
        <a href="inserat.html?id=${p.id}" class="card-media" style="display:block">
          <img src="${img}" alt="" loading="lazy" />
          <span class="card-tag${p.status === 'active' ? '' : ' is-gold'}">${statusLabel(p.status)}</span>
        </a>
        <div class="card-body">
          <div class="card-price">${fmt.price(p.price, p.currency || 'EUR')}</div>
          <div class="card-title">${escapeHtml(p.title || '')}</div>
          <div class="card-loc">${escapeHtml(p.city || '')}, ${escapeHtml(p.country || '')}</div>
          <div style="display:flex;gap:6px;margin-top:14px">
            <a href="inserat.html?id=${p.id}" class="btn btn-ghost btn-sm">Ansehen</a>
            <button class="btn btn-ghost btn-sm" data-toggle="${p.id}" data-status="${p.status}">${p.status === 'active' ? 'Pausieren' : 'Aktivieren'}</button>
            <button class="btn btn-ghost btn-sm" data-delete="${p.id}" style="color:var(--c-danger)">Löschen</button>
          </div>
        </div>
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.toggle;
    const next = b.dataset.status === 'active' ? 'paused' : 'active';
    await supabase.from('properties').update({ status: next }).eq('id', id);
    loadListings();
  }));
  wrap.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Inserat wirklich löschen?')) return;
    await supabase.from('properties').delete().eq('id', b.dataset.delete);
    loadListings();
  }));
}
function statusLabel(s) {
  return ({ active: 'Aktiv', paused: 'Pausiert', draft: 'Entwurf', rented: 'Vermietet', sold: 'Verkauft' })[s] || s;
}

// ---- Inquiries ------------------------------------------
async function loadInquiries() {
  const wrap = document.getElementById('my-inquiries');
  wrap.innerHTML = '<div class="skeleton" style="height:120px"></div>';

  const { data, error } = await supabase
    .from('inquiries')
    .select('id, from_name, from_email, from_phone, message, created_at, property_id, properties(title, id)')
    .order('created_at', { ascending: false });

  if (error) { wrap.innerHTML = `<div class="alert alert-error">${escapeHtml(error.message)}</div>`; return; }
  if (!data.length) {
    wrap.innerHTML = `<div class="empty-state"><p>Noch keine Anfragen.</p></div>`;
    return;
  }

  wrap.innerHTML = data.map(i => `
    <article class="form-card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:12px">
        <div>
          <strong>${escapeHtml(i.from_name)}</strong> · <a href="mailto:${escapeHtml(i.from_email)}">${escapeHtml(i.from_email)}</a>
          ${i.from_phone ? ` · ${escapeHtml(i.from_phone)}` : ''}
        </div>
        <div class="muted">${fmt.date(i.created_at)}</div>
      </div>
      <p style="white-space:pre-line;margin:0 0 12px">${escapeHtml(i.message)}</p>
      <div class="muted" style="font-size:.85rem">
        Inserat: <a href="inserat.html?id=${i.property_id}">${escapeHtml(i.properties?.title || i.property_id)}</a>
      </div>
    </article>`).join('');
}

// ---- Favorites ------------------------------------------
async function loadFavorites() {
  const wrap = document.getElementById('my-favorites');
  const { data } = await supabase
    .from('favorites')
    .select('property_id, properties(id, title, city, country, price, currency, listing_type, images)')
    .order('created_at', { ascending: false });

  if (!data || !data.length) {
    wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Du hast noch keine Inserate gemerkt.</p></div>`;
    return;
  }
  wrap.innerHTML = data.map(f => {
    const p = f.properties; if (!p) return '';
    const img = (p.images && p.images[0]) || '';
    return `
      <a href="inserat.html?id=${p.id}" class="card">
        <div class="card-media"><img src="${img}" alt="" loading="lazy" /></div>
        <div class="card-body">
          <div class="card-price">${fmt.price(p.price, p.currency || 'EUR')}</div>
          <div class="card-title">${escapeHtml(p.title || '')}</div>
          <div class="card-loc">${escapeHtml(p.city || '')}, ${escapeHtml(p.country || '')}</div>
        </div>
      </a>`;
  }).join('');
}

// ---- Profile --------------------------------------------
async function loadProfile() {
  const form = document.getElementById('profile-form');
  const { data: { user } } = await supabase.auth.getUser();
  form.email.value = user.email || '';

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).maybeSingle();

  if (profile) {
    form.display_name.value = profile.display_name || '';
    form.account_type.value = profile.account_type || 'private';
    form.company_name.value = profile.company_name || '';
    form.website.value      = profile.website || '';
  }
}
function initProfileForm() {
  document.getElementById('profile-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = document.getElementById('profile-msg');
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').upsert({
      id:           user.id,
      email:        user.email,
      display_name: fd.get('display_name'),
      account_type: fd.get('account_type'),
      company_name: fd.get('company_name') || null,
      website:      fd.get('website') || null,
    });
    msg.innerHTML = error
      ? `<div class="alert alert-error">${escapeHtml(error.message)}</div>`
      : `<div class="alert alert-success">Profil aktualisiert.</div>`;
  });
}
