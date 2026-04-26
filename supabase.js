// js/supabase.js · zentrale Supabase-Initialisierung

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://ybcsfykzhlbucilrttsn.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_RSzVwKqoPCe7xMl9H_jobg_-5Cz2t5g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'immodays-auth',
  },
});

// Hilfs-Konstanten ----------------------------------------
export const COUNTRIES = [
  { code: 'DE', label: 'Deutschland', flag: '🇩🇪', currency: 'EUR' },
  { code: 'AT', label: 'Österreich',  flag: '🇦🇹', currency: 'EUR' },
  { code: 'CH', label: 'Schweiz',     flag: '🇨🇭', currency: 'CHF' },
  { code: 'ES', label: 'Spanien',     flag: '🇪🇸', currency: 'EUR' },
];

export const PROPERTY_TYPES = [
  { code: 'apartment',  label: 'Wohnung' },
  { code: 'house',      label: 'Haus' },
  { code: 'land',       label: 'Grundstück' },
  { code: 'commercial', label: 'Gewerbe' },
  { code: 'room',       label: 'Zimmer / WG' },
];

export const FEATURE_KEYS = [
  { code: 'balcony',     label: 'Balkon' },
  { code: 'terrace',     label: 'Terrasse' },
  { code: 'garden',      label: 'Garten' },
  { code: 'parking',     label: 'Stellplatz' },
  { code: 'garage',      label: 'Garage' },
  { code: 'elevator',    label: 'Aufzug' },
  { code: 'cellar',      label: 'Keller' },
  { code: 'attic',       label: 'Dachboden' },
  { code: 'furnished',   label: 'Möbliert' },
  { code: 'pets',        label: 'Haustiere erlaubt' },
  { code: 'barrier_free',label: 'Barrierefrei' },
  { code: 'fitted_kitchen', label: 'Einbauküche' },
  { code: 'fireplace',   label: 'Kamin' },
  { code: 'pool',        label: 'Pool' },
  { code: 'air_con',     label: 'Klimaanlage' },
];

export const ENERGY_CLASSES = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
