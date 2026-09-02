# Nächste Schritte — Harmonic Scout

Stand: Verbesserungsrunde „Fundament & Robustheit“ (Tests, Typsicherheit,
Pitch-Detektor, Bundle). Was jetzt noch offen ist, nach Priorität sortiert.

Legende: **P0** = Fehler/Risiko · **P1** = zahlt sich kurzfristig aus ·
**P2** = größerer Umbau · **P3** = Ideen.

---

## P0 — Muss als Nächstes

### 1. Geteilter Mikrofon-Service (statt ein AudioContext pro Modul)
`core/usePitchStream.ts` öffnet pro Modul-Instanz einen eigenen
`AudioContext` und einen eigenen `getUserMedia`-Stream. Beim Wechsel zwischen
Lick-Trainer, Coach, Jam und Rhythm Jam können deshalb kurzzeitig mehrere
Streams/Contexts parallel offen sein (Chrome limitiert ~6 AudioContexts, das
Mikrofon bleibt „heiß“).

Zielbild: ein Singleton-Service (`core/micService.ts`) mit
- genau einem `AudioContext` + einem `MediaStream`,
- Refcounting (`acquire()` / `release()`) für die Hooks,
- Subscriber-Liste statt State pro Hook.

`usePitchStream` bleibt nach außen identisch → alle Module unverändert.

### 2. Tailwind aus dem CDN holen
`index.html` lädt `https://cdn.tailwindcss.com`. Das ist ausdrücklich nur für
Prototypen gedacht: die App ist ohne Internet nicht vollständig nutzbar, das
Styling wird erst zur Laufzeit erzeugt, und es gibt eine Konsolen-Warnung.

Umstieg auf `@tailwindcss/vite` (Tailwind v4) und die Klassen in eine echte
`src/styles.css`. Aufwand: mittel — danach ist die App offline-fähig und der
Build reproduzierbar.

### 3. API-Key nicht im Client-Bundle
`vite.config.ts` injiziert `GEMINI_API_KEY` in das Frontend — wer die Seite
lädt, kann den Key auslesen.
- Kurzfristig: Nur Quota-beschränkte Test-Keys, Hinweis in `.env.example`.
- Richtig: kleiner Proxy (Cloudflare Worker / Vercel Function / Node-Server),
  der den Aufruf mit serverseitigem Key macht. Die App ruft dann
  `/api/analyze` statt Gemini direkt.

---

## P1 — Nächste sinnvolle Schritte

### 4. Gemeinsames Audio-Layout: Tone-Transport-Konflikte
`Metronome` und `LickPlayer` teilen sich `Tone.Transport` und rufen beide
`transport.cancel()`. Wer Loop und Metronom gleichzeitig startet, nimmt dem
anderen die Events weg.
- `Tone.getTransport()` nur noch an einer Stelle zurücksetzen,
- oder getrennte `Tone.Transport`-Instanzen pro Spieler.

### 5. Tests auf die Module ausweiten
92 Unit-Tests decken heute `core/` ab (Audio, Theorie, Matching, Harmonie,
Griffbilder, Fortschritt, Quiz/Gehörbildung, Bibliothek). Sinnvolle nächste
Schritte:
- `@testing-library/react` + jsdom für die interaktiven Module
  (LickTrainer-Phasen, Rhythm-Jam-Auflösung),
- PDF-Import: `parseAsciiTab` / `parseTextNoteLines` mit echten Tab-Blöcken,
- Golden-Test: erkannte Notenfolge → erwartete Tonart.

### 6. Barrierefreiheit & Tastatur
Viele Bedienelemente sind reine `<div>`/`<span>`-Buttons oder range-Slider
ohne sichtbares Label. Nachziehen: echte `<button>`s, `aria-pressed` für
Toggles, Fokus-Ringe (die Neon-Ästhetik verträgt sichtbare Fokus-States),
`prefers-reduced-motion` für Scanlines/Glitch-Animationen.

### 7. Diagnose-Seite für die Tonerkennung
Weil der Detektor jetzt NSDF-basiert ist, wäre ein kleines Panel hilfreich:
Live-Frequenz, NSDF-Peak, erkannte Note, Latenz, Input-Pegel. Damit lässt
sich Fehlern „die App erkennt meine Gitarre nicht“ in Sekunden auf den Grund
gehen (Pegel zu leise? Oktavfehler? Rauschen?).

---

## P2 — Größere Umbauten

### 8. `App.tsx` in Module schneiden
563 Zeilen mit Pitch-Loop, Analyse-State und komplettem Layout. Aufteilen in
`AnalysisView`, `TrainerView`, `AppHeader` — die Shell bleibt dann lesbar und
die Tabs lassen sich einzeln testen.

### 9. State-Management für Fortschritt
`core/progress.ts` schreibt synchron in `localStorage`, `useProgress` hält
eine Kopie im State; `grant()` liest additionally frisch vom Storage. Das
funktioniert, ist aber anfällig für verlorene Updates, wenn zwei Module
gleichzeitig XP vergeben. Ein einziger Store (Context + Reducer oder
`zustand`) mit versioniertem Schema (`v2`) wäre sauberer — inkl. Migration.

### 10. PWA / Offline
Mit lokal gebündeltem Tailwind und pdfjs-Worker fehlt nur ein Service Worker
und ein Manifest, damit die App installierbar ist. Fürs Üben im Proberaum
(ohne Netz) ein echter Gewinn.

### 11. Reines CSS-Theme statt 370 Zeilen Inline-CSS
`index.html` trägt das komplette Styling. In `src/styles.css` (oder
CSS-Module) auslagern, Themes als CSS-Variablen-Datei — besser wartbar und
cachebar.

---

## P3 — Ideen

- **Akkord-Erkennung polyphon**: aktuell nur über die gesammelten Noten
  (`identifyChord`). Echte simultane Erkennung (Chroma-Vektor / FFT-Peaks)
  würde den Jam-Coach deutlich verbessern.
- **Recording/Playback von Übungen**: kurze Takes speichern und
  gegenüberstellen (Web-MediaRecorder + Waveform).
- **Übungsplan**: XP/Streak in einen Wochenplan übersetzen („heute: Timing
  80→90 BPM“).
- **Sound-Bibliothek**: bessere Gitarren-Sounds (Samples statt Synth) für
  Playback und Gehörbildung.
- **GitHub Actions**: nach CI auch ein Preview-Deploy pro PR.
