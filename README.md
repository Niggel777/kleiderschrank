# Garderobe – digitaler Kleiderschrank

Kleidungsstücke fotografieren, der Hintergrund wird direkt im Browser entfernt, Farben werden erkannt. Danach: wie in einem Shop stöbern, Outfits vorschlagen lassen, in der Umkleide anprobieren, Tragehistorie und Schrankhüter sehen, Teile für Vinted vorbereiten.

**App:** https://niggel777.github.io/kleiderschrank/

## Funktionen

- **Schrank als Shop:** Kategorien, Suche, Filter (Farbe, Größe, Saison, Anlass, Marke, Favoriten, lange nicht getragen), Sortierung (u. a. nach Größe, Preis, zuletzt getragen)
- **Teil anlegen:** Foto → Freistellen (ONNX-Modell im Browser) → automatische Farberkennung → Details
- **Outfits:** Generator nach Farbharmonie, Stil, Anlass, Wetter (Open-Meteo) und Schrankhütern; Teile festhalten und neu mischen; selbst zusammenstellen
- **Umkleide:** eigenes Foto (optional freigestellt auf Studio-Hintergrund) oder Schneiderpuppe; Teile ziehen, skalieren, drehen; Looks als Bild speichern – auch mit Teilen von der Wunschliste
- **Kalender & Tragehistorie:** was wann getragen wurde, Kosten pro Tragen
- **Analyse:** Tragequote, Schrankhüter, Lieblinge, Farbpalette, Kategorien, Verkaufserlöse
- **Verkaufen:** Produktfoto, Anzeigentext und Preisvorschlag für Vinted
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
