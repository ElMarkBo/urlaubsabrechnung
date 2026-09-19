# Urlaubsabrechnung – Projektreferenz

> Verhaltensregeln/Konventionen: keine projektspezifischen, es gelten die
> globalen aus `~/.claude/CLAUDE.md`.
> Historie / Abschlussberichte → `LERNJOURNAL.md`
>
> Diese Datei ist die einzige Quelle für „Wo stehen wir / was ist offen".
> Offene Punkte leben ausschließlich hier; Abgeschlossenes wandert als
> Bericht ins LERNJOURNAL.

---

## Status (Stand 2026-09-19)

PWA (HTML/CSS/JS, kein Framework) für Android + iOS über „Zum
Home-Bildschirm" (kein natives Projekt, siehe Entscheidung unten).
Firebase/Firestore als Cloud-Backend: automatischer Sync zwischen
mehreren Geräten/Personen, sobald Internet da ist, mit eingebauter
Offline-Persistenz für die Erfassung ohne Netz (Details/Setup-Schritte
in `README.md`).

Grundfunktionen fertig:
- Reise anlegen (6-stelliger Code) oder per Code/Link beitreten
  (Onboarding-Bildschirm, auch `?trip=CODE`-Link für Ein-Klick-Beitritt)
- Erfassen (Betrag, Kategorie, Datum, Notiz, optional Person-Tag „Dein Name")
- Liste (Filter nach Kategorie + Person + Volltextsuche, Sortierung nach
  Datum/Betrag, Löschen) — automatisch synchronisiert über alle Geräte
  derselben Reise
- Auswertung (Summary-Cards: Gesamt/Einträge/Tage/Ø pro Tag,
  Kategorie-Balkendiagramm, Tages-Balkendiagramm, Personen-Balkendiagramm
  (nur sichtbar ab 2 Namen) — alle per Canvas, keine externe Chart-Bibliothek)
- Einstellungen: Reisetitel, Dein Name (lokal, nicht Teil der
  Sync-Daten), Währung, Kategorien verwalten, Reise-Code/Link
  teilen, Reise auf diesem Gerät verlassen
- CSV-Export (inkl. Person-Spalte), JSON-Backup-Export (reine
  Download-Kopie, kein Re-Import mehr nötig — Sync läuft automatisch)
- Sync-Status-Anzeige im Header (● grün = synchronisiert, ● amber =
  offline/ausstehend)
- Offline-fähig per Service Worker (App-Code) + Firestore-Persistenz
  (Nutzdaten)

## Bewusste Scope-Entscheidungen

- **Eine Währung pro Reise**, Teil der geteilten Reise-Daten (kein
  Mischen/Umrechnen mehrerer Währungen).
- **Firebase/Firestore statt Marke-Eigenbau-Sync.** Ursprünglich war ein
  rein lokaler Ansatz mit manuellem JSON-Merge-Import geplant — Nutzer
  wollte aber echten automatischen Hintergrund-Sync ("Budget im Blick
  behalten"), das geht mit reinem Static Hosting nicht. Firestores
  Offline-Persistenz ist genau für "offline erfassen, online
  synchronisieren" gebaut (fertige, robuste Technik statt Eigenbau) —
  passt zur SPOF-Regel aus der globalen CLAUDE.md (regelmäßig genutzte
  Funktion → sauber bauen, nicht 80%-Hack).
- **Anonyme Auth + Reise-Code statt echtem Login.** Kein
  Account/Passwort für die Nutzer nötig. Schutz kommt allein über die
  Code-Geheimhaltung (6 Zeichen, ~1 Mrd. Kombinationen) — bewusste
  Vereinfachung für eine private Zwei-Personen-Urlaubskasse, **nicht**
  für sensible Daten geeignet. Siehe `firestore.rules`.
- **Kein Splitwise-artiges Aufteilungs-/Schulden-Feature** — auf
  Nutzerwunsch bewusst nicht gebaut. Es gibt aber ein leichtgewichtiges
  optionales "Dein Name"-Feld pro Gerät, das Einträge taggt (nur
  Sichtbarkeit/Filter/Sortierung "nach Person", keine Verrechnung).
- **PWA statt native App** — einzige praktikable Ein-Codebasis-Lösung für
  Android + iOS ohne Mac/Xcode/Apple-Developer-Account.

## Offen / Backlog

- 🔴 **Firebase-Projekt noch nicht angelegt.** `js/firebase-config.js`
  enthält noch Platzhalter-Werte (`"TODO"`) — ohne echtes Firebase-Projekt
  bleibt die App auf dem Onboarding-Bildschirm mit Warnung stehen.
  Setup-Anleitung in `README.md`, Abschnitt „Firebase einrichten".
- 🔴 **GitHub Pages Hosting noch nicht eingerichtet.** Lokales Repo
  existiert (`git log` zeigt Commits), aber kein GitHub-Remote/Push —
  das Anlegen eines **öffentlichen** Repos wurde vom Auto-Mode-
  Klassifikator als Public-Surface-Aktion blockiert und braucht explizite
  Freigabe durch den Nutzer (oder Nutzer legt das Repo selbst an: `gh repo
  create urlaubsabrechnung --public --source=. --remote=origin --push`).
  Ohne HTTPS-Hosting keine Installation auf iOS.
- 🟡 **Echter Funktionstest im Browser steht aus**, insbesondere der neue
  Firebase-Sync-Flow (Reise anlegen/beitreten, Realtime-Update zwischen
  zwei Sessions, Offline→Online-Übergang). In dieser Session weder Node
  noch ein Browser-Automatisierungstool verfügbar (`claude-in-chrome`
  nicht eingerichtet). Geprüft wurde stattdessen: HTML-Tag-Balance +
  JS→HTML-ID-Abgleich, JSON-Validität, HTTP-Erreichbarkeit aller Assets,
  Cross-Check der `sync.js`-Exports gegen `app.js`-Aufrufe, sowie
  mehrfaches manuelles Code-Review der Firebase-API-Aufrufe. **Vor
  echtem Urlaubseinsatz zwingend:** mit echtem Firebase-Projekt einmal
  durchklicken — Reise anlegen, mit zweitem Gerät/Browser beitreten,
  Eintrag auf Gerät A machen und Ankunft auf Gerät B prüfen, Offline-Modus
  testen (Flugmodus an, Eintrag erfassen, Flugmodus aus → Sync prüfen).
- 🟡 **App-Icon ist Platzhalter** — pixel-generiertes „Sonnenuntergang"-Icon
  (kein Bild-/Designtool in dieser Umgebung verfügbar). Bei Bedarf
  ersetzen: `icons/icon-192.png`, `icons/icon-512.png`,
  `icons/apple-touch-icon.png` (quadratisch, PNG).
- 🟢 Branch lokal bereits auf Umbenennung zu `main` vorbereitet gewesen,
  aber durch den blockierten `gh repo create`-Aufruf nicht ausgeführt —
  noch auf `master`. Vor dem Push ggf. `git branch -m master main`.
