# Urlaubsabrechnung

Progressive Web App (PWA) zum Erfassen und Auswerten von
Urlaubsausgaben — für mehrere Personen auf getrennten Handys, mit
automatischem Hintergrund-Sync sobald Internet da ist. Läuft auf
Android und iOS als vom Homescreen installierbare App.

## Architektur

- **Statischer Frontend-Code** (HTML/CSS/JS, kein Framework) —
  gehostet z.B. über GitHub Pages.
- **Firebase/Firestore** als Cloud-Datenbank für den Sync zwischen
  Geräten. Anonyme Anmeldung (kein Login/Passwort nötig), Firestores
  eingebaute Offline-Persistenz übernimmt Erfassung ohne Netz +
  automatische Synchronisierung, sobald wieder Verbindung da ist.
- **Reise-Code:** ein 6-stelliger Code verbindet mehrere Geräte mit
  derselben Reise (Firestore-Dokument `trips/{code}`). Wer den Code
  kennt, kann mitlesen/-schreiben — siehe „Sicherheitsmodell" unten.

## Firebase einrichten (einmalig, vor dem ersten Einsatz nötig)

Ohne diesen Schritt läuft die App nur mit einer Warnung im
Onboarding-Bildschirm — es gibt keine „ohne Sync"-Betriebsart.

1. [console.firebase.google.com](https://console.firebase.google.com) →
   „Projekt hinzufügen" → Name frei wählbar (z.B. `urlaubsabrechnung`) →
   Google Analytics kann deaktiviert werden.
2. Im Projekt: linkes Menü → **Build → Firestore Database** →
   „Datenbank erstellen" → Modus **Produktionsmodus** wählen (nicht
   Testmodus — die eigenen Regeln aus `firestore.rules` in diesem Repo
   ersetzen das) → Standort z.B. `eur3 (europe-west)`.
3. Im Firestore-Bereich → Tab **Regeln** → Inhalt durch den Inhalt von
   [`firestore.rules`](firestore.rules) ersetzen → Veröffentlichen.
4. Linkes Menü → **Build → Authentication** → „Los geht's" → Tab
   „Sign-in method" → **Anonym** aktivieren (kein Google-Konto der
   Nutzer nötig, nur eine anonyme Geräte-Identität für die Regeln).
5. Zahnrad oben links → **Projekteinstellungen** → „Meine Apps" →
   `</>` (Web-App hinzufügen) → Name frei wählbar → **Firebase Hosting
   NICHT aktivieren** (wir hosten separat über GitHub Pages) →
   Registrieren.
6. Der angezeigte Codeblock (`const firebaseConfig = { apiKey: ..., ... }`)
   wird 1:1 in [`js/firebase-config.js`](js/firebase-config.js)
   eingetragen (die `TODO`-Platzhalter ersetzen).

## Lokal testen

```
python3 -m http.server 8000
```

dann im Browser `http://localhost:8000` öffnen. Für den vollen Sync-Test
braucht es zwei Browser-Sessions (bzw. zwei Geräte) mit unterschiedlichem
lokalem Speicher — z.B. ein normales Fenster + ein Inkognito-Fenster.

## Auf dem Handy installieren

**Voraussetzung:** HTTPS (Ausnahme: `localhost`). GitHub Pages liefert
das automatisch.

- **Android (Chrome):** Seite öffnen → Menü (⋮) → „App installieren".
- **iOS (Safari):** Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm".

## Reise starten / beitreten

Beim ersten Öffnen: entweder **„Reise starten"** (legt einen neuen
6-stelligen Code an) oder **„Reise beitreten"** mit dem Code der/des
anderen. Der Code steht danach auch jederzeit unter ⚙️ „Reise teilen" —
„Kopieren" kopiert einen fertigen Link (`?trip=CODE`), den die andere
Person nur noch antippen muss, um direkt beizutreten.

Ab dann läuft alles automatisch: jede Person erfasst offline auf dem
eigenen Handy, sobald wieder Internet da ist, gleichen sich beide
Geräte im Hintergrund ab — inklusive Kategorien, Titel und Währung.

## Sicherheitsmodell

Es gibt **keine feingranulare Rechteprüfung** — jede angemeldete
(auch anonyme) Person, die den Reise-Code kennt, kann diese eine Reise
lesen und schreiben. Der Schutz kommt allein daher, dass der Code nicht
öffentlich geteilt wird (er ist nicht erratbar: 6 Zeichen aus einem
32-stelligen Alphabet ≈ eine Milliarde Kombinationen). Für eine private
Zwei-Personen-Urlaubskasse ausreichend — **nicht** geeignet für
sensible oder besonders schützenswerte Daten.

## Daten sichern

Auswertung → „Backup (JSON) exportieren" bzw. „CSV exportieren" — reine
Download-Kopien für den eigenen Gebrauch (Excel, Archiv). Die
eigentliche Datenhaltung läuft über Firestore, nicht über diese Dateien.

## Projektstruktur

```
index.html            Onboarding + Haupt-App (drei Tabs)
css/style.css          Styling, hell/dunkel automatisch nach Systemeinstellung
js/app.js              UI-Logik (Rendering, Formulare, Charts, Export)
js/sync.js              Firebase-Anbindung (Auth, Firestore, Realtime-Sync)
js/firebase-config.js   Eigene Firebase-Projekt-Zugangsdaten (siehe oben)
manifest.json           PWA-Manifest (Icons, Name, Startseite)
sw.js                   Service Worker für Offline-Nutzung des App-Codes
firestore.rules         Referenz-Kopie der Firestore-Sicherheitsregeln
icons/                  App-Icons (generiert)
```

## Bekannte Grenzen

- Eine Währung pro Reise, kein Umrechnen zwischen Währungen — auf
  allen Geräten gemeinsam eingestellt (Teil der Reise-Daten).
- Erstes Anlegen/Beitreten einer Reise braucht einmalig Internet
  (anonyme Anmeldung + Firestore-Erstzugriff). Danach läuft die
  Erfassung komplett offline weiter.
- Keine Aufteilung zwischen mehreren Personen (bewusst nicht gebaut,
  siehe `projekt.md`) — nur ein optionales Namens-Tag pro Eintrag.
