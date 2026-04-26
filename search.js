// js/search.js · Filter, Suche, Pagination

import { supabase, FEATURE_KEYS } from './supabase.js';
import { fmt, escapeHtml, fillCountrySelect, getQuery, setQuery } from './main.js';

const PAGE_SIZE = 12;

// Initialer State aus URL ---------------------------------
const initial = getQuery();
const form = document.getElementById('filter-form');

// Country
fillCountrySelect(document.getElementById('f-country'), initial.country || 'DE');

// Listing-Type Tabs
let listingType = initial.listing_type || 'rent';
const tabs = document.querySelectorAll('[data-listing]');
const setListingTabs = () => tabs.forEach(t => t.classList.toggle('is-active', t.dataset.listing === listingType));
setListingTabs();
document.getElementById('f-listing').value = listingType;
tabs.forEach(t => t.addEventListener('click', () => {
  listingType = t.dataset.listing;
  setListingTabs();
  document.getElementById('f-listing').value = listingType;
}));

// Suchfeld vorbelegen
if (initial.q) document.getElementById('f-q').value = initial.q;

// Property-Type Checkboxes
const ptInitial = (initial.property_type || '').split(',').filter(Boolean);
form.querySelectorAll('input[name="property_type"]').forEach(cb => {
  cb.checked = ptInitial.includes(cb.value);
});

// Sortierung
const sortSel = document.getElementById('sort-select');
if (initial.sort) sortSel.value = initial.sort;

// Number-Felder
['price_min','price_max','area_min','area_max','rooms_min','rooms_max'].forEach(f => {
  if (initial[f]) form.querySelector(`[name="${f}"]`).value = initial[f];
});

// Features
const featuresEl = document.getElementById('f-features');
const featInitial = (initial.features || '').split(',').filter(Boolean);
featuresEl.innerHTML = FEATURE_KEYS.map(f => `
  <label><input type="checkbox" name="features" value="${f.code}" ${featInitial.includes(f.code) ? 'checked' : ''} /> ${f.label}</label>
`).join('');

// Source
const srcInitial = (initial.source || 'immodays').split(',').filter(Boolean);
form.querySelectorAll('input[name="source"]').forEach(cb => cb.checked = srcInitial.includes(cb.value));

// Form -> URL ---------------------------------------------
form.addEventListener('submit', e => {
  e.preventDefault();
  applyFilters(1);
});
form.addEventListener('reset', () => {
  setTimeout(() => {
    listingType = 'rent';
    setListingTabs();
    document.getElementById('f-listing').value = listingType;
    applyFilters(1);
  }, 0);
});
sortSel.addEventListener('change', () => applyFilters(1));

function readForm() {
  const fd = new FormData(form);
  const v = {
    country: fd.get('country') || 'DE',
    listing_type: fd.get('listing_type') || 'rent',
    q: (fd.get('q') || '').trim(),
    price_min: fd.get('price_min'),
    price_max: fd.get('price_max'),
    area_min:  fd.get('area_min'),
    area_max:  fd.get('area_max'),
    rooms_min: fd.get('rooms_min'),
    rooms_max: fd.get('rooms_max'),
    property_type: fd.getAll('property_type').join(','),
    features:      fd.getAll('features').join(','),
    source:        fd.getAll('source').join(','),
    sort:          sortSel.value,
  };
  return v;
}

function applyFilters(page = 1) {
  const v = readForm();
  v.page = page;
  history.replaceState(null, '', 'suchen.html?' + setQuery(v));
  loadResults(v, page);
}

// Query bauen ---------------------------------------------
async function loadResults(v, page = 1) {
  const grid = document.getElementById('results-grid');
  const countEl = document.getElementById('results-count');
  countEl.textContent = '…';

  let q = supabase
    .from('properties')
    .select('id, title, city, country, price, currency, listing_type, property_type, rooms, living_area, images, source, created_at, features', { count: 'exact' })
    .eq('status', 'active');

  if (v.country)       q = q.eq('country', v.country);
  if (v.listing_type)  q = q.eq('listing_type', v.listing_type);
  if (v.q)             q = q.or(`city.ilike.%${v.q}%,postal_code.ilike.%${v.q}%,title.ilike.%${v.q}%`);
  if (v.price_min)     q = q.gte('price', Number(v.price_min));
  if (v.price_max)     q = q.lte('price', Number(v.price_max));
  if (v.area_min)      q = q.gte('living_area', Number(v.area_min));
  if (v.area_max)      q = q.lte('living_area', Number(v.area_max));
  if (v.rooms_min)     q = q.gte('rooms', Number(v.rooms_min));
  if (v.rooms_max)     q = q.lte('rooms', Number(v.rooms_max));

  if (v.property_type) {
    const arr = v.property_type.split(',').filter(Boolean);
    if (arr.length) q = q.in('property_type', arr);
  }
  if (v.features) {
    const arr = v.features.split(',').filter(Boolean);
    if (arr.length) q = q.contains('features', arr);
  }
  if (v.source) {
    const arr = v.source.split(',').filter(Boolean);
    if (arr.length === 1 && arr[0] === 'immodays') q = q.eq('source', 'immodays');
    else if (arr.length === 1 && arr[0] === 'external') q = q.neq('source', 'immodays');
  }

  // Sortierung
  const [col, dir] = (v.sort || 'created_at.desc').split('.');
  q = q.order(col, { ascending: dir === 'asc' });

  // Pagination
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Fehler beim Laden: ${escapeHtml(error.message)}</p></div>`;
    countEl.textContent = '0';
    return;
  }

  countEl.textContent = fmt.number(count ?? 0);

  if (!data || data.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m20 20-3-3"/></svg>
        <h3 style="margin-bottom:8px">Keine Treffer</h3>
        <p>Passe die Filter an oder erweitere den Suchbereich.</p>
      </div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  grid.innerHTML = data.map(p => {
    const img = (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=70';
    const tag = p.listing_type === 'rent' ? 'Miete' : 'Kauf';
    const sourceTag = p.source && p.source !== 'immodays' ? `<span class="card-source">via ${escapeHtml(p.source)}</span>` : '';
    return `
      <a href="inserat.html?id=${p.id}" class="card">
        <div class="card-media">
          <img src="${img}" alt="${escapeHtml(p.title || '')}" loading="lazy" />
          <span class="card-tag${p.listing_type === 'buy' ? ' is-gold' : ''}">${tag}</span>
          ${sourceTag}
          <button type="button" class="card-fav" aria-label="Merken" onclick="event.preventDefault();event.stopPropagation();this.classList.toggle('is-active')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="card-body">
          <div class="card-price">${fmt.price(p.price, p.currency || 'EUR')}${p.listing_type === 'rent' ? ' <small style="font-size:.7em;color:#9a9a9a">/ Monat</small>' : ''}</div>
          <div class="card-title">${escapeHtml(p.title || '')}</div>
          <div class="card-loc">${escapeHtml(p.city || '')}, ${escapeHtml(p.country || '')}</div>
          <div class="card-stats">
            ${p.rooms ? `<span>🛏 ${p.rooms} Zi.</span>` : ''}
            ${p.living_area ? `<span>📐 ${fmt.area(p.living_area)}</span>` : ''}
          </div>
        </div>
      </a>`;
  }).join('');

  // Pagination ---------------------------------------------
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pagEl = document.getElementById('pagination');
  if (totalPages <= 1) { pagEl.innerHTML = ''; return; }

  let html = '';
  const make = (n, label = n, dis = false) =>
    `<button class="btn btn-${n === page ? 'primary' : 'ghost'} btn-sm" ${dis ? 'disabled' : ''} data-pg="${n}">${label}</button>`;
  html += make(Math.max(1, page - 1), '‹', page === 1);
  const start = Math.max(1, page - 2), end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) html += make(i);
  html += make(Math.min(totalPages, page + 1), '›', page === totalPages);
  pagEl.innerHTML = html;
  pagEl.querySelectorAll('[data-pg]').forEach(btn => btn.addEventListener('click', () => {
    applyFilters(Number(btn.dataset.pg));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

// Initial laden
applyFilters(Number(initial.page) || 1);
