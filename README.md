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

## Mehrere Personen / Geräte zusammenführen

Es gibt **keine Live-Synchronisierung** — jedes Gerät sammelt offline in
seinem eigenen lokalen Speicher. Zwei (oder mehr) Personen, die
unabhängig voneinander erfassen, führen ihre Daten so zusammen:

1. In den Einstellungen (⚙️) jeweils **denselben Reisetitel und dieselbe
   Währung** einstellen, optional den eigenen Namen unter „Dein Name"
   eintragen (taggt die eigenen Einträge, praktisch beim Zusammenführen).
2. Jede Person exportiert ihr Backup: ⚙️ → „Backup (JSON) exportieren".
3. Auf einem Gerät (z.B. dem Desktop-Browser, für die Endauswertung)
   die App öffnen und über ⚙️ → **„Einträge zusammenführen"** nacheinander
   beide JSON-Dateien einladen. Das **ergänzt** die vorhandenen Einträge
   (dedupliziert automatisch über die interne ID), statt sie zu
   überschreiben.
4. In der Liste/Auswertung lässt sich danach nach Person filtern bzw.
   gibt es einen eigenen "Nach Person"-Chart (erscheint automatisch,
   sobald Einträge von mindestens zwei Namen vorliegen).

Der andere Import-Button, „Backup importieren (ersetzt alles)", ist für
den reinen Wiederherstellungsfall gedacht (z.B. nach Gerätewechsel) —
der überschreibt statt zu ergänzen.

**Achtung Währung:** Es gibt keine Umrechnung zwischen Währungen. Wenn
beide Geräte nicht dieselbe Währung eingestellt haben, warnt die App
beim Zusammenführen, importiert aber trotzdem — die Summen sind dann
nicht mehr aussagekräftig.

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
