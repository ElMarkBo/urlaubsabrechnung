# Urlaubsabrechnung

Einfache Progressive Web App (PWA) zum Erfassen und Auswerten von
Urlaubsausgaben. Läuft im Browser, auf Android und iOS als App vom
Homescreen installierbar. Kein Backend — alle Daten liegen lokal im
Browser (`localStorage`) auf dem jeweiligen Gerät.

## Lokal testen

```
python3 -m http.server 8000
```

dann im Browser `http://localhost:8000` öffnen.

## Auf dem Handy installieren

**Voraussetzung:** Die App muss über HTTPS erreichbar sein (Ausnahme:
`localhost` auf demselben Gerät — iOS erlaubt "Zum Home-Bildschirm" für
PWAs sonst nicht). Am einfachsten dafür: den Ordner als GitHub-Pages-Seite
hosten (kostenlos, automatisch HTTPS) oder auf einem anderen Webspace mit
HTTPS ablegen.

- **Android (Chrome):** Seite öffnen → Menü (⋮) → „App installieren" bzw.
  „Zum Startbildschirm hinzufügen".
- **iOS (Safari):** Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm".

Nach der Installation läuft die App offline (der Service Worker cached
alle Dateien beim ersten Laden).

## Daten sichern / übertragen

Einstellungen (⚙️) → „Backup (JSON) exportieren". Die Datei enthält alle
Ausgaben, Kategorien und Einstellungen und lässt sich über „Backup
importieren" auf einem anderen Gerät oder nach dem Löschen der
Browserdaten wieder einspielen.

**Wichtig:** Es gibt keine automatische Synchronisierung zwischen
Geräten. Wer die App auf zwei Geräten nutzt, muss Backups manuell
exportieren/importieren.

## Projektstruktur

```
index.html      Grundgerüst, drei Tabs (Erfassen / Liste / Auswertung)
css/style.css   Styling, hell/dunkel automatisch nach Systemeinstellung
js/app.js       Gesamte App-Logik (Speicherung, Rendering, Charts, Export/Import)
manifest.json   PWA-Manifest (Icons, Name, Startseite)
sw.js           Service Worker für Offline-Nutzung
icons/          App-Icons (generiert, siehe projekt.md)
```

## Bekannte Grenzen

- Eine Währung pro Reise, kein Umrechnen zwischen Währungen.
- Kein Geräte-Sync (siehe oben) — Backup-Export/Import ist der Weg dafür.
- Keine Aufteilung zwischen mehreren Personen (bewusst nicht gebaut,
  siehe `projekt.md`).
