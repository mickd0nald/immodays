// js/auth.js · Session-Management & UI-Glue

import { supabase } from './supabase.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// Schaltet Login/Logout-Knöpfe in der Navi je nach Status -
export async function paintNavAuth() {
  const session = await getSession();
  const loggedOut = document.querySelectorAll('[data-auth="logged-out"]');
  const loggedIn  = document.querySelectorAll('[data-auth="logged-in"]');
  loggedOut.forEach(el => el.style.display = session ? 'none' : '');
  loggedIn.forEach(el => el.style.display  = session ? '' : 'none');

  document.querySelectorAll('[data-action="signout"]').forEach(btn => {
    btn.addEventListener('click', e => { e.preventDefault(); signOut(); });
  });
}

// Schutz für eingeloggte Bereiche -------------------------
export async function requireAuth(redirect = 'anmelden.html') {
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${redirect}?next=${next}`;
    return null;
  }
  return session;
}

// Session-Wechsel beobachten ------------------------------
supabase.auth.onAuthStateChange(() => paintNavAuth().catch(() => {}));
