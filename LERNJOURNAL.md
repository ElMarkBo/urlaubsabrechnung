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

2026-09-24 — Inbetriebnahme: GitHub Pages + Firebase-Projekt live
Kontext: Beide roten Blocker aus dem Backlog (Hosting, Firebase) über
zwei Sessions abgearbeitet — Ziel war der erste echte Einsatz der App.

Entscheidungen:
- Branch lokal auf `main` umbenannt, danach öffentliches Repo mit
  `gh repo create urlaubsabrechnung --public --source=. --remote=origin
  --push` angelegt — Nutzer hat die Public-Surface-Freigabe im Gespräch
  explizit erteilt (vorherige Blockade durch Auto-Mode-Klassifikator
  damit aufgelöst).
- GitHub Pages per `gh api repos/.../pages` (legacy Build, Branch
  `main`, Pfad `/`) aktiviert statt über die Weboberfläche — schneller
  und nachvollziehbar im Terminal.
- Firebase-Projekt „urlaubskasse" (Projekt-ID `urlaubskasse-7b6ee`) vom
  Nutzer live in der Konsole angelegt, Schritt für Schritt anhand der
  README-Anleitung begleitet (Firestore Produktionsmodus + eigene
  Regeln aus `firestore.rules`, anonyme Auth, Web-App-Registrierung
  ohne Firebase Hosting). Der von der Konsole gelieferte Codeblock
  enthielt zusätzlich `measurementId` (Analytics) — bewusst nicht mit
  übernommen, da Analytics in diesem Projekt nicht genutzt wird und
  `firebase-config.js` nur die für Auth/Firestore nötigen Felder
  vorsieht.
- `js/firebase-config.js` mit echten Werten befüllt und gepusht (Config
  ist laut Projektkommentar kein Geheimnis, Schutz läuft über
  `firestore.rules`).

Erkenntnisse:
- `gh repo create --public` lief diesmal ohne Blockade durch — die
  Blockade in der Vorsession war an die fehlende explizite
  Nutzerfreigabe gebunden, nicht an den Befehl selbst.
- Deployment-Verzögerung von GitHub Pages (Erstaktivierung wie auch
  Content-Update nach Push) zuverlässig per Monitor/Poll-Loop auf den
  HTTP-Response-Body abgewartet statt fest verstrichene Zeit zu raten.

Offene Punkte / Backlog:
- 🟡 Echter Funktionstest steht weiterhin aus (Reise anlegen, zweites
  Gerät per Code/Link beitreten lassen, Offline→Online-Sync prüfen) —
  muss der Nutzer selbst durchklicken, in dieser Umgebung kein Browser
  verfügbar.
- 🟡 App-Icon weiterhin Platzhalter.
- 🟢 Firestore Security Rules-Modell (Reise-Code als einziger Schutz)
  unverändert — bewusste Altlast aus dem Projektstart, kein neuer
  Punkt.

Memory-Updates: keine (siehe oben).

---

2026-09-24 — Korrekturfunktion für Einträge nachgerüstet
Kontext: Erster echter Einsatz nach dem Go-Live lief laut Nutzer
ausgezeichnet, aber ein Eintrag hatte ein falsches Datum — es gab bis
dahin nur Erfassen/Löschen, kein In-Place-Korrigieren.

Entscheidungen:
- Bearbeiten läuft über dasselbe Formular wie Erfassen (kein separater
  Dialog): ✏️-Button in der Liste füllt Betrag/Kategorie/Datum/Notiz
  ins Formular, Submit-Button wechselt auf „Speichern" + „Abbrechen"
  erscheint. Weniger neue UI-Fläche als ein Modal, nutzt vorhandene
  Formularvalidierung mit.
- `sync.updateExpense` ist bewusst identisch zu `addExpense`
  (`setDoc` ohne Merge, komplettes Dokument überschreiben) — beide
  bleiben als eigene benannte Funktionen bestehen, weil die Aufrufer
  in `app.js` unterschiedliche Absicht ausdrücken (neu vs. korrigieren),
  nicht weil sich die Firestore-Mechanik unterscheidet.
- `id`/`owner`/`createdAt` des Originaleintrags bleiben beim Speichern
  erhalten (Spread von `original` vor den geänderten Feldern) — Edit
  darf weder den Ersteller noch den Sortier-Zeitstempel verändern.

Erkenntnisse:
- `node --check` war in dieser Umgebung doch vorhanden (entgegen dem
  Session-Start-Eintrag vom 2026-09-18 „kein Node verfügbar") — reicht
  für Syntaxprüfung, ersetzt aber keinen echten Browsertest.

Offene Punkte / Backlog:
- 🟡 Echter Funktionstest mit zwei Geräten weiterhin offen (unverändert
  aus der Vorsession).
- 🟡 App-Icon weiterhin Platzhalter.

Memory-Updates: keine (siehe oben).

---
