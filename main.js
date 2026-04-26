// js/main.js · gemeinsam genutzte Helpers für alle Seiten

import { paintNavAuth } from './auth.js';
import { COUNTRIES } from './supabase.js';

// ---------------- Format ---------------------------------
export const fmt = {
  price(value, currency = 'EUR') {
    if (value == null || isNaN(value)) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  },
  number(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('de-DE').format(v);
  },
  area(v) {
    return v == null ? '—' : `${fmt.number(v)} m²`;
  },
  date(d) {
    if (!d) return '';
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(d));
  },
};

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}

// ---------------- Navi -----------------------------------
export function initNav() {
  const burger = document.querySelector('.nav-burger');
  const links  = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', () => links.classList.toggle('is-open'));
  }
  paintNavAuth();
}

// ---------------- Cookie-Banner --------------------------
const COOKIE_KEY = 'immodays-cookie-consent-v1';
export function initCookieBanner() {
  if (localStorage.getItem(COOKIE_KEY)) return;
  const html = `
    <div class="cookie-banner is-visible" role="dialog" aria-label="Datenschutz-Hinweis">
      <div class="cookie-banner-inner">
        <p>Wir verwenden ausschließlich technisch notwendige Cookies, damit du eingeloggt bleibst und die Suche funktioniert. Mehr in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>
        <div class="cookie-actions">
          <button class="btn btn-ghost btn-sm" data-cookie="decline">Nur notwendige</button>
          <button class="btn btn-primary btn-sm" data-cookie="accept">Verstanden</button>
        </div>
      </div>
    </div>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap.firstElementChild);
  document.querySelectorAll('[data-cookie]').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, btn.dataset.cookie);
      document.querySelector('.cookie-banner').remove();
    });
  });
}

// ---------------- URL-Helfer -----------------------------
export function getQuery() {
  const p = new URLSearchParams(window.location.search);
  return Object.fromEntries(p.entries());
}
export function setQuery(obj) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== '' && v != null) p.set(k, v);
  });
  return p.toString();
}

// ---------------- Country Select befüllen ----------------
export function fillCountrySelect(select, selected = 'DE') {
  if (!select) return;
  select.innerHTML = COUNTRIES.map(c => `
    <option value="${c.code}" ${c.code === selected ? 'selected' : ''}>${c.flag} ${c.label}</option>
  `).join('');
}

// ---------------- Boot -----------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCookieBanner();
});
