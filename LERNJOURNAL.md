# Lernjournal – Urlaubsabrechnung

Entscheidungskontext (Warum, nicht Was) + Sessionsberichte. Einträge
werden bei „Projekt speichern" hier angehängt (neueste zuunterst).
Aktueller Stand/Backlog → `projekt.md`.

---

2026-09-18 — Projektstart: PWA für Urlaubsausgaben, Pivot zu Firebase-Sync
Kontext: Neues Projekt. Wunsch: einfache Android-App zum Erfassen und
Auswerten von Urlaubsausgaben, im Gespräch erweitert auf iOS, auf zwei
unabhängig genutzte Handys (Partner) und am Ende automatischen
Hintergrund-Sync fürs Budget im Blick während der Reise.

Entscheidungen:
- PWA statt native App/Flutter: einzige Ein-Codebasis-Lösung für
  Android+iOS ohne Mac/Xcode/Apple-Developer-Account.
- Erste Iteration: rein lokal (localStorage) + manueller
  JSON-"Zusammenführen"-Import zwischen Geräten, weil "muss offline
  gehen" zunächst als Ausschlusskriterium für jede Cloud-Lösung
  gelesen wurde.
- Zweite Iteration (Kurskorrektur): Nutzer wollte den manuellen
  Merge-Button nicht — automatischer Sync sobald Netz da ist, inkl.
  Partner-Einträgen sichtbar während der Reise. Das ist mit
  Static-Hosting allein nicht baubar; umgestellt auf Firebase/Firestore
  (anonyme Auth + Firestore-Offline-Persistenz), da laut globaler
  SPOF-Regel eine regelmäßig genutzte Sync-Funktion sauber gebaut
  gehört statt als Bastellösung (z.B. Gist-Hack).
- Datenmodell: `trips/{code}` + Subcollection `expenses/{id}` (nicht
  ein großes JSON-Blob) — Einzeldokument-Writes merged Firestore selbst
  bei parallelen Offline-Edits zweier Geräte, ohne eigene Merge-Logik.
- Zugriffsschutz über unerratbaren 6-stelligen Reise-Code statt
  echtem Nutzer-Login (kein Passwort/Account-Aufwand für eine private
  Zwei-Personen-Urlaubskasse) — bewusst dokumentierte Schwäche, nicht
  für sensible Daten geeignet.
- Standard-Kategorien auf Wunsch verschlankt: Unterkunft/Essen/Auto/
  Freizeit (weiterhin erweiterbar).
- Kein Splitwise-artiges Aufteilungs-Feature (explizit nicht gewollt),
  stattdessen nur optionales Namens-Tag pro Eintrag zur Sichtbarkeit.

Erkenntnisse:
- Bei mehrdeutigen/großen Anforderungen lohnt sich Rückfragen vor dem
  Bauen — die erste Architektur (lokal + Merge-Button) war in sich
  konsistent und getestet, wurde aber komplett verworfen, weil eine
  zentrale Anforderung ("unsere" Ausgaben, automatischer Sync) erst im
  Gespräch nachträglich sichtbar wurde statt vorab geklärt.
- Kein Node/Browser/JS-Engine in dieser Arbeitsumgebung verfügbar →
  kein automatisierter Test, keine `claude-in-chrome`-Verbindung.
  Verifikation lief über HTML-Tag-Balance, JS→HTML-ID-Abgleich,
  JSON-Validität, HTTP-Erreichbarkeit der Assets (lokaler
  `python3 -m http.server`) und mehrfaches manuelles Code-Review.
  Ein selbstgebauter Klammer-Balance-Checker produzierte wiederholt
  Fehlalarme bei Regex-Literalen (`/[&<>"']/g`) — Ansatz verworfen,
  manuelles Lesen war zuverlässiger.
- Vor dem Schreiben von Integrationscode (Firebase-SDK-Version, CDN-URL)
  live per WebFetch verifiziert statt aus dem Training geraten —
  bestätigt v12.19.0 auf gstatic existiert, bevor die Version fest
  einprogrammiert wurde.
- `gh repo create --public` wird vom Auto-Mode-Klassifikator als
  "Public Surface"-Aktion blockiert und braucht explizite
  Nutzerfreigabe; ein direkt danach abgesetzter harmloser
  Folgebefehl im selben Ordner (`git branch --show-current`) wurde
  ebenfalls blockiert — wirkte wie ein kurzzeitiger Kontext-Bleed der
  Klassifizierung, ein späterer anderer Git-Befehl lief wieder normal.

Offene Punkte / Backlog:
- 🔴 Firebase-Projekt noch nicht angelegt, `js/firebase-config.js` hat
  nur Platzhalter — App bleibt ohne das auf dem Onboarding-Screen
  hängen. Anleitung in README.md.
- 🔴 GitHub-Repo/Pages-Hosting noch nicht eingerichtet (blockiert, s.o.),
  Freigabe oder eigenes Anlegen durch Nutzer nötig.
- 🟡 Echter Funktionstest im Browser (insbesondere Firebase-Sync
  zwischen zwei Sessions, Offline→Online-Übergang) steht aus.
- 🟡 App-Icon ist Platzhalter (pixel-generiert, kein Designtool
  verfügbar).
- 🟢 Branch heißt noch `master` statt `main` (Umbenennung durch
  blockierten Befehl nicht durchgelaufen).

Memory-Updates: keine (Projekt hat eigenes LERNJOURNAL/projekt.md,
Details bleiben dort — siehe globale Regel zu projektübergreifendem
Memory).

---
