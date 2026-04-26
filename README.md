# immodays

Statisches Immobilienportal für Deutschland, Österreich, die Schweiz und Spanien — gehostet auf **GitHub Pages** mit **Supabase** als Backend (Datenbank, Auth, Storage).

> **USPs**
>
> - **Kostenlos für alle** — auch für Makler:innen und gewerbliche Nutzer:innen.
> - **International** von Anfang an: DE / AT / CH / ES.
> - **Cross-Portal-Aggregation** vorgesehen (Inserate aus ImmoScout24, Immowelt, Kleinanzeigen u. a. werden als externe Quelle gekennzeichnet und auf das Original verlinkt — der eigentliche Crawler ist als separater Backend-Service vorgesehen, läuft also nicht in dieser statischen Seite).

---

## Stack

- **Frontend**: statisches HTML, modernes CSS (Custom Properties, Grid, Flex), ESM-JavaScript ohne Build-Step.
- **Schriften**: Carter One (Logo), Fraunces (Display-Serif), DM Sans (Body) — geladen über Google Fonts.
- **Backend**: Supabase (Postgres + RLS, Auth, Storage).
- **Hosting**: GitHub Pages.

Es gibt **keinen Build-Schritt**. Der Inhalt des Repos kann direkt ausgeliefert werden.

---

## Verzeichnisstruktur

```
immodays/
├── index.html              Startseite mit Hero-Suche
├── suchen.html             Ergebnisliste mit Filtern
├── inserat.html            Detailansicht eines Inserats
├── inserieren.html         Formular zum Veröffentlichen (Auth nötig)
├── konto.html              Dashboard: Inserate, Favoriten, Profil, Anfragen
├── anmelden.html           Login
├── registrieren.html       Sign-up (privat / gewerblich / Makler)
├── impressum.html
├── datenschutz.html
├── agb.html
├── 404.html
├── css/
│   └── styles.css          Vollständiges Designsystem
├── js/
│   ├── supabase.js         Client + gemeinsame Konstanten
│   ├── auth.js             Session-Handling, Logout, Nav-State
│   ├── main.js             Formatierung, Cookie-Banner, Nav
│   ├── search.js           Suche, Filter, Pagination, URL-State
│   ├── inserat.js          Detailseite + Anfrageformular
│   ├── inserieren.js       Multi-Step-Formular + Upload
│   └── konto.js            Dashboard-Logik
└── supabase/
    ├── schema.sql          Komplettes Schema (Tabellen, Enums, RLS, Trigger)
    └── storage_policies.sql Storage-Policies für property-images-Bucket
```

---

## Erstmaliges Deployment

### 1. Repo auf GitHub anlegen

```bash
# lokal
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/mickd0nald/immodays.git
git push -u origin main
```

### 2. GitHub Pages aktivieren

1. Repo auf github.com → **Settings** → **Pages**.
2. **Source**: `Deploy from a branch`.
3. **Branch**: `main`, Folder: `/ (root)` → **Save**.
4. Nach ein bis zwei Minuten ist die Seite unter `https://mickd0nald.github.io/immodays/` erreichbar.

### 3. Supabase einrichten

Folge der Schritt-für-Schritt-Anleitung in **`SUPABASE_SETUP.md`** (alles über das Dashboard, keine CLI nötig):

1. `supabase/schema.sql` im SQL Editor ausführen.
2. Storage-Bucket `property-images` als öffentlichen Bucket anlegen (5 MB Limit, JPG/PNG/WebP).
3. `supabase/storage_policies.sql` im SQL Editor ausführen.
4. Auth-URL-Konfiguration setzen (Site-URL + Redirect-URLs).
5. E-Mail-Templates auf Deutsch anpassen.

---

## Lokal vorschauen

Da die Seite ESM-Module verwendet, muss sie über einen lokalen Webserver geöffnet werden — `file://` funktioniert **nicht**.

```bash
# Python
python3 -m http.server 8000

# oder Node
npx serve -p 8000
```

Dann im Browser: `http://localhost:8000`.

**Wichtig:** `http://localhost:8000` muss in Supabase unter **Authentication → URL Configuration → Redirect URLs** eingetragen sein, sonst funktionieren Login und E-Mail-Bestätigung lokal nicht.

---

## Designsystem (Kurzfassung)

| Token | Wert | Verwendung |
|---|---|---|
| `--c-white` | `#ffffff` | Basisflächen |
| `--c-cream` | `#faf7f1` | Sekundäre Flächen |
| `--c-paper` | `#f4efe6` | Karten / sanfte Trenner |
| `--c-line` | `#e7e1d4` | Linien / Borders |
| `--c-navy` | `#0b1f4d` | Buttons, Logo „days" |
| `--c-navy-deep` | `#081538` | Dunkle Sektionen |
| `--c-navy-soft` | `#1a3370` | Hover-Zustände |
| `--c-gold` | `#c9a24b` | Akzent, Logo „immo" |
| `--c-gold-deep` | `#a8862f` | Akzent dunkler |
| `--c-gold-tint` | `#f5ecd6` | Akzentflächen |

Schriftarten:

- **Carter One** — ausschließlich für das Wortmark-Logo `immodays`.
- **Fraunces** — Display-Serif für Überschriften (h1/h2 prominent).
- **DM Sans** — Body-Text und UI.

---

## DSGVO-Hinweise

Die Plattform ist DSGVO-orientiert aufgebaut:

- Kein Tracking, keine Werbe-Cookies.
- Cookie-Banner nur als Hinweis (nur technisch notwendige Cookies + LocalStorage werden eingesetzt).
- Anfrageformulare enthalten Pflicht-Checkbox für die Einwilligung zur Datenverarbeitung.
- „Adresse auf Anfrage" als Standard-Sichtbarkeit von Adressen.
- Vollständige Datenschutzerklärung und Impressum.

**Vor Live-Gang empfohlen:**

1. **Google Fonts** lokal hosten (Schriften aus dem Repo ausliefern statt von `fonts.googleapis.com`). So entfällt die IP-Übertragung an Google. Die Datei `css/styles.css` enthält oben drei `@import`-Zeilen, die durch lokale `@font-face`-Regeln ersetzt werden können.
2. **Beispielbilder** (Unsplash) durch eigene Inhalte oder lokal eingebundene Assets ersetzen, sobald die ersten echten Inserate vorhanden sind.
3. **AV-Vertrag** mit Supabase abschließen (im Supabase-Dashboard verfügbar).
4. **AV-Vertrag** mit GitHub abschließen (für GitHub Pages, falls die Domain produktiv genutzt wird).

---

## Was bewusst **nicht** Teil dieses Repos ist

- **Crawler für externe Portale.** Das ist zwingend ein eigener Backend-Service (Cron-Job oder Edge Function), weil Crawling im Browser durch CORS und Rate-Limits blockiert wird. Das Datenmodell ist aber bereits darauf vorbereitet: `properties.source`, `properties.source_url`, und die UI zeigt für externe Inserate automatisch einen „Zum Originalanbieter"-Button statt das interne Anfrageformular.
- **Multilingualität.** Bewusst zurückgestellt, um den ersten Wurf nicht zu komplex zu machen. Vorgesehen ist später ein i18n-Layer mit JSON-Sprachdateien je Land/Sprache.
- **Bezahlfunktionen.** Aktuell ist alles kostenlos. Sollten später Premium-Features dazukommen, ist Stripe + Supabase Edge Functions der natürliche Weg.

---

## Roadmap / nächste Schritte

1. ✅ Statische Seite live, Supabase verbunden, Inserate funktionieren.
2. Eigene Domain `immodays.com` bei GitHub Pages eintragen, in Supabase als Site/Redirect-URL ergänzen.
3. Crawler-Service als Supabase Edge Function bauen (separat).
4. i18n / Mehrsprachigkeit (DE → EN → ES → FR …).
5. Saved-Search-Mailings (Edge Function + täglicher Cron).
6. Karte mit Maplibre / Leaflet auf der Suchseite.

---

© 2026 immodays
