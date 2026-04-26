# Supabase Einrichtung für immodays

Diese Anleitung führt dich durch die komplette Einrichtung **ohne CLI**, ausschließlich über das Supabase-Dashboard.

Projekt-URL: `https://ybcsfykzhlbucilrttsn.supabase.co`
Publishable Key (anon): `sb_publishable_RSzVwKqoPCe7xMl9H_jobg_-5Cz2t5g`

---

## 1. Datenbank-Schema anlegen

1. Öffne dein Projekt im Supabase-Dashboard.
2. Linke Seitenleiste → **SQL Editor** → **New query**.
3. Öffne die Datei `supabase/schema.sql` aus diesem Repo, kopiere den **gesamten** Inhalt und füge ihn in den Editor ein.
4. Klicke **Run** (oder ⌘/Ctrl + Enter).
5. Erwartetes Ergebnis: `Success. No rows returned`.

Damit existieren jetzt:

- Tabellen: `profiles`, `properties`, `favorites`, `inquiries`, `saved_searches`
- Enums: `account_type`, `listing_type`, `property_type`, `country_code`, `address_visibility`, `listing_status`, `listing_source`
- Trigger, der bei jeder neuen Registrierung automatisch ein Profil anlegt
- Row-Level-Security-Policies für alle Tabellen

---

## 2. Storage-Bucket für Inseratsbilder

### 2.1 Bucket anlegen

1. Linke Seitenleiste → **Storage** → **New bucket**.
2. Name: `property-images`
3. **Public bucket**: einschalten ✅
4. **File size limit**: `5 MB`
5. **Allowed MIME types**: `image/jpeg, image/png, image/webp`
6. **Save**.

### 2.2 Storage-Policies setzen

1. Zurück zum **SQL Editor** → **New query**.
2. Inhalt von `supabase/storage_policies.sql` einfügen → **Run**.

Die Policies sorgen dafür:

- Jeder kann Bilder **lesen** (Inserate sind öffentlich).
- Eingeloggte Nutzer:innen können nur in ihren **eigenen Ordner** schreiben (`{user_id}/...`).
- Andere Nutzer:innen können fremde Bilder weder ändern noch löschen.

---

## 3. Authentifizierung konfigurieren

### 3.1 E-Mail-Anbieter

1. **Authentication** → **Providers** → **Email** muss aktiv sein (ist standardmäßig an).
2. **Confirm email**: empfohlen ✅ (Doppelter Opt-in, DSGVO-freundlich).

### 3.2 URL-Konfiguration

1. **Authentication** → **URL Configuration**
2. **Site URL** (für die GitHub-Pages-Variante):

   ```
   https://mickd0nald.github.io/immodays
   ```

3. **Redirect URLs** (eine pro Zeile):

   ```
   https://mickd0nald.github.io/immodays
   https://mickd0nald.github.io/immodays/
   https://mickd0nald.github.io/immodays/anmelden.html
   https://mickd0nald.github.io/immodays/konto.html
   http://localhost:8000
   http://localhost:8000/
   http://localhost:8000/anmelden.html
   http://localhost:8000/konto.html
   ```

   Sobald die echte Domain `immodays.com` aktiv ist, ergänze sie analog.

### 3.3 E-Mail-Templates (deutsch)

**Authentication** → **Email Templates** — passe mindestens **Confirm signup** und **Reset password** an. Beispiel für „Confirm signup":

- **Subject**: `Willkommen bei immodays – bitte bestätige deine E-Mail`
- **Body**:

  ```
  Hallo {{ .Email }},

  willkommen bei immodays. Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren:

  {{ .ConfirmationURL }}

  Wenn du dich nicht registriert hast, ignoriere diese Nachricht einfach.

  Viele Grüße
  immodays
  ```

---

## 4. (Optional) Beispiel-Inserat einfügen

Damit die Startseite und die Suche schon vor dem ersten echten Inserat etwas zeigen, kannst du im **SQL Editor** folgendes ausführen:

```sql
insert into public.properties (
  title, description, listing_type, property_type,
  country, postal_code, city, district,
  rooms, living_area, price, currency, additional_costs,
  features, images, status, source, address_visibility, is_business
) values (
  '3-Zimmer-Altbau mit Stuck und Balkon',
  'Helle, sanierte Altbauwohnung in zentraler Lage mit Eichenparkett und Südbalkon.',
  'rent', 'apartment',
  'DE', '67059', 'Ludwigshafen', 'Mitte',
  3, 86.5, 980, 'EUR', 180,
  '["balcony","parquet","cellar","fitted_kitchen"]'::jsonb,
  '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600"]'::jsonb,
  'active', 'immodays', 'on_request', false
);
```

---

## 5. Schlüssel ins Frontend übernehmen

Im Repo unter `js/supabase.js` sind URL und Publishable Key bereits eingetragen:

```js
const SUPABASE_URL = 'https://ybcsfykzhlbucilrttsn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RSzVwKqoPCe7xMl9H_jobg_-5Cz2t5g';
```

Falls du ein anderes Projekt anbindest, hier austauschen. Der **Publishable Key** ist nicht geheim — er darf im Browser stehen. Den **Service-Role-Key** verwenden wir nirgendwo im Frontend (das wäre unsicher).

---

## 6. Schnelltest

1. Site lokal öffnen (siehe `README.md`).
2. **Registrieren** → E-Mail bestätigen.
3. **Anmelden** → in der Datenbank unter **Table Editor → profiles** sollte automatisch eine Zeile angelegt sein.
4. **Inserieren** → Inserat veröffentlichen → Eintrag erscheint in `properties` und auf der Suchseite.

Wenn alles funktioniert, ist das Setup abgeschlossen. ✅

---

## 7. Was später dazukommen kann

- **Eigener SMTP** (Authentication → SMTP Settings) für eigene Versanddomain.
- **Edge Functions** für den Crawler externer Portale (separater Service, läuft nicht im Browser).
- **Domain immodays.com** als Custom Domain bei GitHub Pages anbinden, dann in **URL Configuration** ergänzen.
- **Self-hosting** der Google-Fonts und Beispielbilder, sobald die Plattform live ist (DSGVO-freundlicher).
