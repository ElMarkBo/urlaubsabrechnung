# Urlaubsabrechnung – Projektreferenz

> Verhaltensregeln/Konventionen: keine projektspezifischen, es gelten die
> globalen aus `~/.claude/CLAUDE.md`.
> Historie / Abschlussberichte → `LERNJOURNAL.md`
>
> Diese Datei ist die einzige Quelle für „Wo stehen wir / was ist offen".
> Offene Punkte leben ausschließlich hier; Abgeschlossenes wandert als
> Bericht ins LERNJOURNAL.

---

## Status (Stand 2026-09-18, Erstanlage)

PWA (HTML/CSS/JS, kein Framework, kein Backend) zum Erfassen und
Auswerten von Urlaubsausgaben. Zielplattformen: Android + iOS über
„Zum Home-Bildschirm" (kein natives Android/iOS-Projekt, siehe
Entscheidung unten). Daten liegen ausschließlich lokal im
Browser-`localStorage` des jeweiligen Geräts.

Grundfunktionen fertig:
- Erfassen (Betrag, Kategorie, Datum, Notiz, optional Person-Tag "Dein Name")
- Liste (Filter nach Kategorie + Person + Volltextsuche, Sortierung nach
  Datum/Betrag, Löschen)
- Auswertung (Summary-Cards: Gesamt/Einträge/Tage/Ø pro Tag,
  Kategorie-Balkendiagramm, Tages-Balkendiagramm, Personen-Balkendiagramm
  (nur sichtbar ab 2 Namen) — alle per Canvas, keine externe Chart-Bibliothek)
- Einstellungen: Reisetitel, Dein Name, Währung, Kategorien verwalten
- CSV-Export (inkl. Person-Spalte), JSON-Backup-Export/Import (ersetzt alles),
  JSON-"Zusammenführen"-Import (ergänzt, dedupliziert per ID),
  „Alle Daten löschen"
- Offline-fähig per Service Worker (App-Shell-Cache)

## Bewusste Scope-Entscheidungen

- **Eine Währung pro Reise**, kein Mischen/Umrechnen mehrerer Währungen.
- **Kein Live-Sync zwischen Geräten**, dafür ein **"Zusammenführen"-Import**
  (ergänzt statt überschreibt, dedupliziert per ID). Grund: Erfassung muss
  komplett offline funktionieren (kein Netz am Urlaubsort) — "live"
  synchronisieren geht in dem Fall ohnehin nicht, ein manueller/periodischer
  Abgleich per JSON-Export ist die einzig robuste Option ohne Backend.
  Für zwei Personen, die unabhängig auf eigenem Handy erfassen (Workflow
  in `README.md`).
- **Kein Splitwise-artiges Aufteilungs-/Schulden-Feature** — auf
  Nutzerwunsch bewusst nicht gebaut. Es gibt aber ein leichtgewichtiges
  optionales "Dein Name"-Feld pro Gerät, das Einträge taggt (nur
  Sichtbarkeit/Filter/Sortierung "nach Person", keine Verrechnung).
- **PWA statt native App** — einzige praktikable Ein-Codebasis-Lösung für
  Android + iOS ohne Mac/Xcode/Apple-Developer-Account.

## Offen / Backlog

- 🟡 **Echter Funktionstest im Browser steht aus.** In dieser Session war
  weder Node noch ein Browser-Automatisierungstool verfügbar
  (`claude-in-chrome` nicht eingerichtet). Geprüft wurde stattdessen:
  HTML-Tag-Balance + JS→HTML-ID-Abgleich (Python-Skript), JSON-Validität
  von `manifest.json`, HTTP-Erreichbarkeit aller Assets über lokalen
  `python3 -m http.server`, sowie manuelles Code-Review. Vor echtem Urlaubseinsatz: einmal im Browser durchklicken
  (Eintrag anlegen, Liste/Filter, Auswertung/Charts, Einstellungen-Dialog,
  Service-Worker-Registrierung in DevTools prüfen).
- 🟡 **Hosting für iOS-Installierbarkeit klären.** iOS erlaubt „Zum
  Home-Bildschirm" für PWAs nur über HTTPS (Ausnahme: `localhost`).
  Empfehlung: GitHub Pages (kostenlos, automatisch HTTPS). Noch nicht
  eingerichtet.
- 🟡 **App-Icon ist Platzhalter** — pixel-generiertes „Sonnenuntergang"-Icon
  (kein Bild-/Designtool in dieser Umgebung verfügbar). Bei Bedarf
  ersetzen: `icons/icon-192.png`, `icons/icon-512.png`,
  `icons/apple-touch-icon.png` (quadratisch, PNG).
