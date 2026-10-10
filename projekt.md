# Urlaubsabrechnung – Projektreferenz

> Verhaltensregeln/Konventionen: keine projektspezifischen, es gelten die
> globalen aus `~/.claude/CLAUDE.md`.
> Historie / Abschlussberichte → `LERNJOURNAL.md`
>
> Diese Datei ist die einzige Quelle für „Wo stehen wir / was ist offen".
> Offene Punkte leben ausschließlich hier; Abgeschlossenes wandert als
> Bericht ins LERNJOURNAL.

---

## Status (Stand 2026-10-10)

PWA (HTML/CSS/JS, kein Framework): iOS über „Zum Home-Bildschirm",
Android zusätzlich als Capacitor-Hülle `app-android/` (Debug-APK, Weg
zum Play Store; siehe Entscheidung unten). Sichtbare Version
`MAJOR.FIX` (Quelle `js/version.js`, Details README); bleibt `1.0`
bis zur ersten Veröffentlichung.
Firebase/Firestore als Cloud-Backend: automatischer Sync zwischen
mehreren Geräten/Personen, sobald Internet da ist, mit eingebauter
Offline-Persistenz für die Erfassung ohne Netz (Details/Setup-Schritte
in `README.md`).

Grundfunktionen fertig:
- Reise anlegen (6-stelliger Code) oder per Code/Link beitreten
  (Onboarding-Bildschirm, auch `?trip=CODE`-Link für Ein-Klick-Beitritt)
- Erfassen (Betrag, Kategorie, Datum, Notiz, optional Person-Tag „Dein Name")
- Liste (Filter nach Kategorie + Person + Volltextsuche, Sortierung nach
  Datum/Betrag, Bearbeiten, Löschen) — automatisch synchronisiert über
  alle Geräte derselben Reise
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
- **PWA + Capacitor-Hülle nur für Android.** iPhone bleibt PWA (kein
  Mac/Xcode/Apple-Developer-Account). Android bekommt für den Play Store
  eine Capacitor-Hülle (statt TWA: Offline-Start unabhängig von Chrome,
  Share-Plugin); eine Codebasis, `sync-web.mjs` kopiert sie nach `www/`.
- **Einladung per Link/QR/Share-Sheet**, kein In-App-Scanner (Kamera-App
  reicht).

## Betrieb

- **Hosting:** https://elmarkbo.github.io/urlaubsabrechnung/ (GitHub
  Pages, Branch `main`, Repo öffentlich unter
  https://github.com/ElMarkBo/urlaubsabrechnung).
- **Firebase-Projekt:** `urlaubskasse` (Projekt-ID `urlaubskasse-7b6ee`)
  angelegt, Firestore + anonyme Auth aktiv, `js/firebase-config.js` mit
  echten Werten befüllt und gepusht. Details/Verlauf: `LERNJOURNAL.md`,
  Eintrag 2026-09-24.

## Offen / Backlog

- 🟡 **Echter Funktionstest (zwei Geräte) steht aus**, insbesondere der
  Firebase-Sync-Flow (Reise anlegen/beitreten, Realtime-Update zwischen
  zwei Sessions, Offline→Online-Übergang) — jetzt mit echtem, live
  gehostetem Firebase-Projekt möglich, aber noch nicht durchgeklickt (in
  dieser Arbeitsumgebung kein Browser verfügbar). **Vor echtem
  Urlaubseinsatz zwingend:** Reise anlegen, mit zweitem Gerät/Browser
  beitreten, Eintrag auf Gerät A machen und Ankunft auf Gerät B prüfen,
  Offline-Modus testen (Flugmodus an, Eintrag erfassen, Flugmodus aus →
  Sync prüfen).
- 🟠 **APK 1.0 auf echtem Android-Gerät testen** (Offline-Start, Beitritt,
  QR/Teilen, Deep Link) — bisher nur gebaut, nie ausgeführt.
- 🟠 **Firebase-API-Key-Referrer prüfen**: falls eingeschränkt,
  `https://localhost` in Cloud Console → Anmeldedaten freigeben, sonst
  kann die Auth in der App scheitern.
- 🟡 **Verifizierte App Links**: Repo `ElMarkBo/elmarkbo.github.io`
  (assetlinks.json + `.nojekyll`, Pages aktiv) steht seit 2026-10-10;
  Verifikation am Gerät noch prüfen (`adb shell pm get-app-links
  io.github.elmarkbo.urlaubskasse`). Vor Play-Release Play-Signing-
  Fingerprint in beide Kopien (Repo + `app-android/app-links/`) ergänzen.
- 🟡 **Tags `v2.0`/`v2.1` löschen** (lokal + origin): Versionen wurden
  verworfen, Version bleibt `1.0` bis zur Veröffentlichung. Löschen vom
  Auto-Mode blockiert, braucht Nutzer-Freigabe.
- 🟡 **Code-Verlust auf Android**: Ursache unbewiesen, Mitigation
  (IndexedDB-Spiegel + `persist()`) live. Gegenprobe: App wegwischen und
  neu öffnen; wird wieder gefragt, räumt das Gerät auch IndexedDB.
- 🟡 **Play-Veröffentlichung**: Entwicklerkonto (25 USD), geschlossener
  Test (12 Tester / 14 Tage), Datenschutzerklärung-URL, Data-Safety,
  Release-Keystore (nie committen) + AAB, appId/Name final bestätigen.
