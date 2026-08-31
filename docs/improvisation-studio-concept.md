# Interaktives Improvisations-Studio — Konzept / Architektur

**Projekt:** Harmonic Scout → „Improvisations-Studio“
**Stand:** Konzept v0.1
**Primärer Fokus:** Lick-Trainer mit PDF-Import
**Sprach-/Anzeige:** Deutsch (Videos/Texte können später lokalisiert werden)

---

## 1. Kurzfassung

Harmonic Scout wird zu einem **interaktiven Improvisations-Studio**:

1. Ein Musiker öffnet die App, spielt eine Note.
2. Die App erkennt die Note **live über das Mikrofon** (bereits vorhandene
   Autokorrelation), zeigt den Bezug (Tonart / Akkord / Skala) und führt ihn
   durch Lerntrainings.
3. Auf der Startseite liegen **spielerische Lernmodule** (Lick-Trainer,
   Improvisations-Coach, Theorie-Quiz, Gehörbildung, Rhythm Jam).
4. Das **Startmodul** ist der **Lick-Trainer**:
   - PDF mit **Text-Ebene** einlesen (digital erstellte Tabs/Noten).
   - Lick wird extrahiert, **vorgespielt** und **visualisiert**.
   - Der Musiker spielt auf seinem Instrument nach.
   - **Nur bei korrekter Note + perfektem Timing** wird das Tempo erhöht.
   - Tempo läuft **variabel innerhalb eines konfigurierbaren min/max**-Bereichs.
5. Fortschritt, Punkte, Level, Streak und freigeschaltete Licks werden
   **lokal im Browser** gespeichert (kein Server/Backend nötig).

Ziel: **kein App-Erlebnis, das nur „feedback gibt“, sondern ein Trainer, der
dich Schritt für Schritt zu mehr Tempo und Sicherheit führt.**

---

## 2. Zielgruppe & Szenarien

| Persona | Bedürfnis | Beispielszenario |
| --- | --- | --- |
| Einsteiger | Verstehen, was ich spiele | „Play a note → zeig mir, in welcher Skala ich bin“ |
| Fortgeschrittene | Licks sauber und schnell lernen | „Lade meinen PDF-Tab, spiele ihn nach, steigere das Tempo“ |
| Lehrer/Coachee | Struktur & Fortschritt nachvollziehbar | „Mein Schüler hat Lick 3 auf 140 BPM geschafft“ |

---

## 3. App-Überblick: Module-Hub

Die App bekommt eine Startansicht mit **Modules** (Kacheln). Jedes Modul hat
denselben Vertrag: `ModulId`, `Titel`, `Beschreibung`, `Fortschritt`,
`Startansicht`.

### Module

| Modul | Zweck | Status |
| --- | --- | --- |
| **Lick-Trainer** | PDF → Lick → Playback + Visualisierung + Tempo-Gating | 🔵 MVP / Fokus |
| Improvisations-Coach | Mic-Input, Tonart-/Skala-Hilfe, Fretboard-Führung | ⚪ Roadmap |
| Theorie-Quiz | Noten, Intervalle, Akkorde, Skalen spielerisch abfragen | ⚪ Roadmap |
| Gehörbildung | Noten/Akkorde hören und korrekt spielen | ⚪ Roadmap |
| Rhythm Jam | Timing/Takt gegen Metronom trainieren | ⚪ Roadmap |
| Lick-Bibliothek | Fertige Licks (Kategorien: Blues, Rock, Jazz, Country) | ⚪ Roadmap |

### Modul-Konvention (Architektur)

Jedes Modul lebt in einem eigenen Ordner und registriert sich zentral:

```ts
interface ModuleDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  progress: () => number; // 0..1 aus localStorage
  component: React.ComponentType;
}
```

Zentrale Module-Registry => Startseite baut sich automatisch, Module können
später einzeln aktiviert/deaktiviert werden.

---

## 4. Das Herzstück: Lick-Trainer

### 4.1 Ablauf (User Journey)

1. **PDF importieren** (per Drag & Drop oder Dateiauswahl).
2. **Lick extrahieren** aus den Textbausteinen der PDF-Datei.
3. **Prüfen/Korrigieren:** Vorschau als Tabelle/Tab; Fehler können manuell
   fixiert werden.
4. **Vorspielen lassen:** App spielt den Lick über Tone.js ab und
   visualisiert ihn (Timeline + Fretboard).
5. **Übungsmodus:** Mikrofon misst dein Spiel.
6. **Gating:** Nur korrekte Note **und** perfektes Timing schalten den
   nächsten Takt frei.
7. **Tempo-Automatik:** pro erfolgreichem Durchlauf +`step`, bis `maxBpm`.
8. **Abschluss:** Statistik, Punkte, Streak, Freischaltungen.
9. **Wiederholen** mit höherem oder gewünschtem Starttempo.

### 4.2 Datenmodell (Single Source of Truth für Musik)

Damit PDF, Playback, Mikrofon-Vergleich und Visualisierung dieselbe
Struktur nutzen, wird ein zentrales Musikdatenmodell verwendet (z. B. in
`types.ts` bzw. eigenem `music-model.ts`):

```ts
// Ein einzelnes Ereignis im Lick
interface LickEvent {
  id: string;
  beat: number;           // Startposition in Beats, z. B. 0, 0.5, 1, 2
  durationBeats: number;  // Dauer in Beats
  playbackNotes: string[]; // Töne für Tone.js (z. B. ["E3", "G3"])
  expectedNotes: string[]; // erwartete Töne für Mikrofon-Vergleich
  isChord: boolean;
  string?: number;        // 1-6 (wenn aus Tab geparst)
  fret?: number;          // Fretboard-Position
}

// Der ganze Lick
interface Lick {
  id: string;
  title: string;
  sourceKind: 'pdf' | 'manual' | 'library';
  sourceFile?: string;
  tempo: {
    startBpm: number;
    minBpm: number;
    maxBpm: number;
    stepBpm: number;
  };
  events: LickEvent[];
  key?: string;          // Tonart, falls erkennbar
  description?: string;
}
```

**Wichtig:** Dieselbe `LickEvent`-Struktur wird für
- **PDF-Parser-Ausgabe**,
- **Playback-Scheduler**,
- **Mikrofon-Erkennung**,
- **Visualisierung (Fretboard/Timeline)**
verwendet. Das ist die „Single Source of Truth“ der Musikdaten.

### 4.3 PDF-Import (digitale PDFs mit Text-Ebene)

**Bibliothek:** `pdfjs-dist` (lauffähig komplett im Browser).

**Pipeline:**

1. PDF laden → alle Seiten als Textbausteine (`getTextContent`).
2. Seiten normalisieren (Zeilen, ASCII-Tab, Notennamen).
3. **Erkennen**:
   - ASCII-Tab: Zeilen `e, B, G, D, A, E` mit Ziffern/`-`.
   - Rallye/Notenschrift: Notennamen + Rhythmusangaben (`E half`, `G quarter`).
   - Standard-Notation ohne Text → Fehlermeldung mit Hinweis.
4. **Parsen zu `LickEvent[]`** (Beat = Spaltenposition, Dauer = Bindebogen/Text, Pitch = Zahl/Note).
5. **Vorschau** zur Bestätigung + manueller Editor (Fehlerkorrektur).

**Fallbacks:**
- Keine Text-Ebene (gescannt) → Hinweis + manuelle Eingabe in einen Lick-Editor.
- PDF zu komplex (mehrstimmig/Polyphonie) → „Nur Monoline“-Modus: oberste/erste Stimme.

### 4.4 Playback

- `Tone.Transport` + pro Event geplante Note (`Tone.PolySynth` / `Tone.Sampler`).
- Metronom optional dazu.
- `durationBeats` steuert Note-Länge.
- Bei Tempoänderung wird der Transport neu gestartet bzw. `Transport.bpm.rampTo`.

### 4.5 Visualisierung

Drei gekoppelte Sichten:

1. **Timeline/Spur:** horizontaler Balken mit Notenblöcken; Cursor bewegt
   sich mit dem Metronom; aktuelle Ziel-Note wird hervorgehoben.
2. **Fretboard:** erwartete Position (String/Fret) + aktuelle gespielte Note.
3. **Status-Panel:** „richtig/falsch/zu früh/zu spät“ + Fortschritt.

### 4.6 Mikrofon-basierte Detektion & Matching

**Bestehendes Erbe:** Autokorrelation + `getNoteFromFrequency` → Note.
**Erweiterung:** Onset-Erkennung (Energie-Spike) für präziseres Timing.

**Vergleich pro Ziel-Event:**

```ts
interface MatchSettings {
  variable: 'note' | 'timing' | 'both'; // "Qualifizierende Variable"
  octaveTolerance: boolean;              // echte Oktave egal/gefordert
  perfectWindowMs: number;               // "perfektes Timing"-Fenster, z. B. ±40 ms
  graceWindowMs: number;                 // großzügige Freigabe, z. B. ±120 ms
}

interface MatchResult {
  noteCorrect: boolean;    // Zielton im gespielten Ton enthalten
  timingCorrect: boolean;  // Zeitdifferenz <= perfectWindowMs
  passed: boolean;         // abhängig von variable
  deltaMs: number;         // zu früh/zu spät
  feedback: 'perfect' | 'good' | 'early' | 'late' | 'wrong-note' | 'miss';
}
```

**Logik der „Variablen“** (dein Wunsch „nur bei einer Variable“):

| `variable` | Voraussetzung zum Weiterkommen |
| --- | --- |
| `note` | Nur Tonhöhe korrekt |
| `timing` | Nur Timing im Fenster |
| `both` (Default) | **Tonhöhe korrekt UND Timing perfekt** |

→ Nur wenn `passed === true`, wird das nächste Event freigeschaltet.

**Fehlerbehandlung:** bei `wrong-note`/`miss` ggf. Segment wiederholen,
bei wiederholten Fehlern `lives` abziehen (optional), vorheriges Event
erneut üben.

### 4.7 Tempo-Steuerung (variabel, min/max)

**Config:**

```ts
interface TempoSettings {
  startBpm: number;   // z. B. 70
  minBpm: number;     // z. B. 60
  maxBpm: number;     // z. B. 160
  stepBpm: number;    // z. B. 5
  afterRuns: number;  // wie viele saubere Durchläufe pro Level, z. B. 1
}
```

**Logik:**

```
currentBpm = startBpm (clamped nach min/max)
nach cleanRun:  currentBpm = min(currentBpm + stepBpm, maxBpm)
nach Fehler:    optional   currentBpm = max(currentBpm - stepBpm, minBpm)
```

**Optionale Variante für Fortgeschrittene:** „adaptive Tempo-Förderung“ —
wenn du 2× sauber gespielt hast, geht das Tempo hoch; wenn du 2× falsch
spielst, geht es runter. Das macht den Trainer „variabel“ im echten Sinne.

### 4.8 Zustandsmaschine (Practice Loop)

```
IDLE
  ├─ IMPORT (PDF) → PARSE → REVIEW → EDIT
  │                        └─ (Fehler → EDIT)
  ▼
PLAYBACK
  ▼
PRACTICE  (Mic aktiv)
  ├─ pending target event → error/miss → RESET_SEGMENT (optional lives-1)
  ├─ correct note+timing → next event
  └─ target sequence complete → TEMPO_UP (BPM+step) → PLAYBACK
  ▼
DONE (Statistik, XP, Streak, Freischaltung) → BACK_TO_HUB
```

---

## 5. Spielerische Lerninhalte (lokal)

### 5.1 Fortschrittsmodell (localStorage)

```ts
interface PlayerProgress {
  xp: number;
  level: number;
  streak: number;
  lastPlayedAt?: string;
  unlockedModuleIds: string[];
  modules: {
    lickTrainer: {
      licks: Record<string, { bestBpm: number; cleanRuns: number; stars: number }>;
    };
  };
}
```

**Spielregeln (Vorschlag):**

- **XP:** perfekte Note + Timing = +10, sauberer Durchlauf = +50, Level up = +100.
- **Level:** aus XP, z. B. `level = floor(xp / 250) + 1`.
- **Streak:** ein sauberer Durchlauf ohne Fehler, 30-%-Fehlerquote bricht ihn.
- **Sterne pro Lick:** für Ziel-BPM-Meilensteine 1★, 2★, 3★.
- **Freischaltung:** Module/Licks werden durch Level freigeschaltet.

**Anti-Frustration:**
- Kein „Game over“-Zwang, sondern „Übungs-Durchlauf“.
- Abwärts-Auto-Tempo nur optional (Standard: nur aufwärts).
- Fehler sind Lern-Daten (Statistik), keine Bestrafung.

---

## 6. Ansichten / Screens (Wireframe-Beschreibung)

### Home / Module-Hub
```
[ Harmonic Scout — Improvisations-Studio ]      Streak ★★★  Level 4  XP 1020
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 🎵 Lick-    │ │ 🎸 Improvi-  │ │ 🎯 Theorie- │
│   Trainer   │ │   sations-   │ │   Quiz      │
│   84%       │ │   Coach      │ │   12%       │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Lick-Trainer
```
[Datei-Drop] PDF hochladen ──> [Vorschau / Editor] ──> [Playback]
───────────────────────────────────────────────────────────────
Timeline:    ██ ███  ██ ███  ██  ██   [Cursor ►]
Fretboard:   [ 3 ] [ 5 ] [ 7 ] ...        aktuell: gefunden "A3" ✓
───────────────────────────────────────────────────────────────
Tempo: 70 → 75 → 80 → 85 → … → 110/160     [min 60] [max 160]
Feedback: ✔ richtig + ✔ Timing (perfekt)  → weiter
```

---

## 7. Technische Umsetzung (geplante Struktur)

```
src/ (bzw. wird in bestehende Struktur eingepflegt)
  core/
    audio/             # pitch detection, onset detection, note matching
    lick/              # Lick-Model, Parser
    pdf/               # PDF-Text-Extraktion
    playback/          # Tone.js Player / Scheduler
    progress/          # localStorage Fortschritt
    module-registry.ts # Modul-Registrierung
  modules/
    lick-trainer/
    improvise/
    theory-quiz/
    ear-training/
    rhythm-jam/
  components/          # bestehende UI (Visualizer, FretboardMini, etc.)
  types.ts / music-model.ts
```

---

## 8. Risiken & Edge Cases

| Risiko | Lösung |
| --- | --- |
| PDF ohne Text (Scan) | Klar sagen; manueller Lick-Editor anbieten |
| Tab-Parsing mehrstimmig | Monoline-Modus; manuelle Korrektur |
| Mikrofon erkennt Verzerrung/Obertöne | Grundton-Filter + `getNoteFromFrequency` + Oktav-Toleranz |
| Timing zu streng | `perfectWindowMs` und `graceWindowMs` einstellbar |
| Polyphonie | Monophon-Modus; später Chord-Events |
| Tempowechsel im Playback | `Tone.Transport.bpm.rampTo` |
| Browser-Mikrofon-Permission | Onboarding + Fallback „Demo-Lick“ ohne Mikrofon |
| Leistung bei vielen Events | Only active window / visuelle Events, kein Rendern aller |

---

## 9. MVP-Roadmap

| Meilenstein | Inhalt | Status |
| --- | --- | --- |
| **M1** | Module-Hub + Progress-localStorage | ✅ MVP umgesetzt |
| **M2** | Lick-Trainer: manueller Lick-Editor + Playback + Fretboard/Timeline | ✅ MVP umgesetzt |
| **M3** | Mic-Matching (Note + Timing) + Gating + Tempo min/max | ✅ MVP umgesetzt |
| **M4** | PDF-Import (Text) + Parser + Korrektur-UI | ✅ MVP umgesetzt (Fokus: ASCII-Tab & Notennamen, Monoline) |
| **M5** | Gamification: XP, Level, Streaks, Sterne, Freischaltungen | ✅ Grundlage (XP/Level/Streak/Sterne), Ausbau folgt |
| **M6** | Improvisations-Coach (Tonart/Skala/Fretboard) | ✅ MVP umgesetzt |
| **M7** | Theorie-Quiz & Gehörbildung & Rhythm Jam | ✅ Rhythm Jam umgesetzt; Theorie-Quiz & Gehörbildung später |

**Status (31.08.2026):** Module-Hub in `modules/ModuleHub.tsx`, Lick-Trainer in
`modules/LickTrainer.tsx`, geteilte Logik in `core/` (audio, licks, playback,
match, progress, pdf). Start über Tab **„Studio“** in `App.tsx`. PDF-Import
(M4) ist umgesetzt: `core/pdf.ts` extrahiert die Text-Ebene aus digitalen PDFs
(ASCII-Tab oder „Note + Beat/Dauer“) und erzeugt direkt `LickEvent[]`.
Zusätzlich: Cyberpunk/Akira-Retro-Sync-Theme.

---

## 10. Offene Entscheidungen (nächste Runde)

1. Soll das Töne-Playback mit Gitarren-Sample (Tone.js `Sampler`) oder
   Synth klingen? → Empfehlung: **Gitarren-/Clean-Sample**, damit es
   realistisch klingt.
2. Welche PDF-Formate sollen zuerst unterstützt werden? → **ASCII-Tab**,
   dann **Noten-Text (Note + Dauer)**.
3. Soll das Tempo bei Fehlern automatisch sinken? → Vorschlag: optional,
   default **nein**.
4. Soll der Lick-Trainer auch **ohne PDF** (Lick-Bibliothek) starten?
   → Empfehlung: ja, als Onboarding.
5. Welche **Zielinstrumente**? → Gitarre zuerst, andere später (Bass,
   Keyboard) über Instrument-Adapter.

---

## 11. Verknüpfung zur Agenten-Koordination (Single Source of Truth)

Dieses Projekt nutzt bereits die Agenten-Koordinations-Infrastruktur:

- **`.agent/plans.json`** → maschinenlesbare Pläne zu Features/Dateien.
- **`scripts/agent-coordination.mjs`** → Agenten melden Vorhaben an und
  prüfen Kollisionen.
- **`AGENTS.md`** → Protokoll.

Für die Umsetzung der Module sollten alle Agenten ihre Pläne (z. B.
`audio-core`, `pdf-importer`, `playback`, `gamification`) dort registrieren,
bevor sie Code anfassen.
