# Garderobe – digitaler Kleiderschrank

Kleidungsstücke fotografieren, der Hintergrund wird direkt im Browser entfernt, Farben werden erkannt. Danach: wie in einem Shop stöbern, Outfits vorschlagen lassen, in der Umkleide anprobieren, Tragehistorie und Schrankhüter sehen, Teile für Vinted vorbereiten.

**App:** https://niggel777.github.io/kleiderschrank/

## Funktionen

- **Heute:** Outfit des Tages nach Wetter, Erfassungsserie, Wiederentdecken, Schnellzugriffe
- **Swipe-Modus:** Outfits wischen – rechts speichern, links weg, hoch heute anziehen
- **Koffer packen:** ein Outfit pro Reisetag nach Wettervorhersage, Packliste mit möglichst wenigen Teilen
- **Teilen:** Outfit als Story-Bild (9:16) über das Teilen-Menü des Handys
- **Wäsche-Status:** Teile in der Wäsche werden nicht vorgeschlagen
- **Gürtel:** passend zu Hose und Schuhfarbe in Vorschlägen
- **Schrank als Shop:** Kategorien, Suche, Filter (Farbe, Größe, Saison, Anlass, Marke, Favoriten, lange nicht getragen), Sortierung (u. a. nach Größe, Farbe, zuletzt getragen)
- **Herren-Profil** (umschaltbar): Kategorien, Unterarten und Größen für Herren
- **Teil anlegen:** Foto → Freistellen (ONNX-Modell im Browser) → automatische Farberkennung → Details
- **Outfits:** Generator nach Farbharmonie, Stil, Anlass, Wetter (Open-Meteo) und Schrankhütern; Teile festhalten und neu mischen; selbst zusammenstellen
- **Umkleide:** eigenes Foto (optional freigestellt auf Studio-Hintergrund) oder Schneiderpuppe; Körpererkennung (MediaPipe Pose) platziert Teile automatisch an Schultern, Hüfte, Beinen und Füßen; Teile ziehen, skalieren, drehen; Looks als Bild speichern – auch mit Teilen von der Wunschliste
- **Kalender & Tragehistorie:** was wann getragen wurde, Kombipartner
- **Analyse:** Tragequote, Schrankhüter, Lieblinge, Vielseitigste Teile, Farbpalette, Kategorien
- **Verkaufen:** Produktfoto und Anzeigentext für Vinted
- **Export:** Obsidian-Vault (Markdown + Dataview) und Sicherung/Wiederherstellung

Alle Daten bleiben lokal im Browser (IndexedDB). Installierbar als App, funktioniert offline.

## Entwickeln

```bash
npm install
npm run dev     # lokaler Server
npm test        # Tests (Farben, Outfit-Generator, Statistik)
npm run deploy  # testen, bauen, auf GitHub Pages veröffentlichen
```

Freistellen: [@imgly/background-removal](https://github.com/imgly/background-removal-js) (AGPL-3.0).
