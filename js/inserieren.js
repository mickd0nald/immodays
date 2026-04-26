// js/inserieren.js · Property anlegen + Foto-Upload

import { supabase, FEATURE_KEYS, ENERGY_CLASSES } from './supabase.js';
import { fillCountrySelect, escapeHtml } from './main.js';

// ---- Auth-Gate ------------------------------------------
const gate = document.getElementById('auth-gate');
const form = document.getElementById('listing-form');
const msg  = document.getElementById('form-msg');

const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  gate.style.display = 'block';
  // Stop hier
} else {
  form.style.display = 'block';
  initForm();
}

function initForm() {
  // Country-Select
  fillCountrySelect(document.getElementById('lf-country'), 'DE');

  // Energie-Klassen
  const energySel = form.querySelector('[name="energy_class"]');
  ENERGY_CLASSES.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    energySel.appendChild(o);
  });

  // Features
  const featWrap = document.getElementById('lf-features');
  featWrap.innerHTML = FEATURE_KEYS.map(f => `
    <label><input type="checkbox" name="features" value="${f.code}" /> ${f.label}</label>
  `).join('');

  // listing_type Toggle für Mietfelder
  const lt = form.querySelector('[name="listing_type"]');
  const updateRentFields = () => {
    form.querySelectorAll('[data-show-when="rent"]').forEach(el => {
      el.style.display = lt.value === 'rent' ? '' : 'none';
    });
  };
  lt.addEventListener('change', updateRentFields);
  updateRentFields();

  // Foto-Preview
  const fileInput = document.getElementById('lf-files');
  const preview   = document.getElementById('lf-preview');
  let pickedFiles = [];
  fileInput.addEventListener('change', () => {
    pickedFiles = [...fileInput.files].slice(0, 12);
    preview.innerHTML = pickedFiles.map((f, i) => `
      <div style="width:90px;height:90px;border-radius:10px;overflow:hidden;background:#f4efe6;position:relative">
        <img src="${URL.createObjectURL(f)}" style="width:100%;height:100%;object-fit:cover" alt="" />
        <span style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,.6);color:#fff;padding:2px 6px;border-radius:4px;font-size:.7rem">${i + 1}</span>
      </div>
    `).join('');
  });

  // Submit
  form.addEventListener('submit', e => submit(e, () => pickedFiles));
}

async function submit(e, getFiles) {
  e.preventDefault();
  msg.innerHTML = '';
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Wird gespeichert…';

  try {
    const fd = new FormData(form);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Du bist nicht eingeloggt.');

    // 1) Bilder hochladen ----------------------------------
    const files = getFiles();
    const imageUrls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from('property-images').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type,
      });
      if (upErr) throw new Error(`Upload fehlgeschlagen: ${upErr.message}`);
      const { data: pub } = supabase.storage.from('property-images').getPublicUrl(path);
      imageUrls.push(pub.publicUrl);
    }

    // 2) Property anlegen ----------------------------------
    const features = fd.getAll('features');
    const insert = {
      user_id:       user.id,
      title:         fd.get('title').trim(),
      description:   fd.get('description').trim(),
      listing_type:  fd.get('listing_type'),
      property_type: fd.get('property_type'),

      country:     fd.get('country'),
      postal_code: fd.get('postal_code') || null,
      city:        fd.get('city').trim(),
      street:      fd.get('street') || null,
      district:    fd.get('district') || null,
      address_visibility: fd.get('address_visibility') || 'on_request',

      rooms:        toNum(fd.get('rooms')),
      bedrooms:     toInt(fd.get('bedrooms')),
      living_area:  toNum(fd.get('living_area')),
      plot_area:    toNum(fd.get('plot_area')),
      floor:        toInt(fd.get('floor')),
      year_built:   toInt(fd.get('year_built')),

      price:            Number(fd.get('price')),
      currency:         fd.get('currency') || 'EUR',
      additional_costs: toNum(fd.get('additional_costs')),
      heating_costs:    toNum(fd.get('heating_costs')),
      deposit:          toNum(fd.get('deposit')),
      commission:       fd.get('commission') || null,

      features,
      energy_class:       fd.get('energy_class') || null,
      energy_value:       toNum(fd.get('energy_value')),
      energy_carrier:     fd.get('energy_carrier') || null,
      energy_certificate: fd.get('energy_certificate') === 'true',

      images: imageUrls,
      status: 'active',
      source: 'immodays',
    };

    const { data, error } = await supabase.from('properties').insert(insert).select('id').single();
    if (error) throw error;

    msg.innerHTML = `<div class="alert alert-success">Inserat veröffentlicht. <a href="inserat.html?id=${data.id}">Zum Inserat</a></div>`;
    setTimeout(() => { window.location.href = `inserat.html?id=${data.id}`; }, 1200);
  } catch (err) {
    msg.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message || 'Unbekannter Fehler.')}</div>`;
    btn.disabled = false; btn.textContent = 'Inserat veröffentlichen';
    window.scrollTo({ top: form.offsetTop - 80, behavior: 'smooth' });
  }
}

function toNum(v) { return v === '' || v == null ? null : Number(v); }
function toInt(v) { return v === '' || v == null ? null : parseInt(v, 10); }
