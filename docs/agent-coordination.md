# Agent Coordination — Dashboard

> Dieses Dashboard wird aus `.agent/plans.json` generiert. Es ist die **Single Source of Truth** für alle Agenten, die an diesem Repo arbeiten. Nicht von Hand editieren — stattdessen die CLI nutzen:

```bash
node scripts/agent-coordination.mjs status
node scripts/agent-coordination.mjs announce --agent <id> --plan "<Titel>" --files "<dateien>"
node scripts/agent-coordination.mjs update --plan <PLAN-ID> --status done
node scripts/agent-coordination.mjs dashboard
```

Aktualisiert: 2026-09-02T12:04:00.857Z

## Agents

| ID | Rolle | Status | Pläne aktiv/gesamt |
| --- | --- | --- | --- |
| `harmonic-scout-core` | Repository maintainer / coordinator | active | 0/7 |
| `audio-engineer` | Pitch detection, autocorrelation, Tone.js playback, audio routing | available | 0/1 |
| `ui-craftsman` | React components, layout, styling, accessibility | available | 0/5 |
| `ai-context-engineer` | Gemini service, prompts, response schemas, analysis types | available | 0/0 |

## Aktive Vorhaben

_Keine aktiven Vorhaben._

## Alle Vorhaben

### PLAN-001 — Initialize Harmonic Scout project

- **Agent:** `harmonic-scout-core`
- **Status:** 🟢 done
- **Bereich:** foundation
- **Betroffene Dateien:** App.tsx, components/, services/, constants.ts, types.ts, index.html, index.tsx

**Ziel:** Bootstrap the Vite + React app with real-time pitch detection, chord recognition, and Gemini-based modal/scale/riff suggestions.

**Notizen:**
- Initial commit 8fcda31 - project boots and core pitch/chord flow works.

### PLAN-002 — Concept: Interactive Improvisation Studio

- **Agent:** `harmonic-scout-core`
- **Status:** 🟢 done
- **Bereich:** docs
- **Betroffene Dateien:** docs/improvisation-studio-concept.md

**Ziel:** Architektur-Konzept fuer den Lick-Trainer (PDF-Import, Playback, Mic-Matching, Tempo-Gating) und spielerische Module.

**Notizen:**
- Status changed to done at 2026-08-30T18:54:37.548Z.
- Konzept v0.1 erstellt.

### PLAN-003 — MVP: Module Hub + Lick Trainer

- **Agent:** `harmonic-scout-core`
- **Status:** 🟢 done
- **Bereich:** modules,core
- **Betroffene Dateien:** modules/, core/, App.tsx, vite.config.ts

**Ziel:** Module-Hub, Lick-Trainer mit manuellem Lick, Playback, Mic-Matching, Tempo-Gating

**Notizen:**
- Status changed to done at 2026-08-30T19:24:23.004Z.
- MVP M1-M3 umgesetzt: Module-Hub, Lick-Trainer mit Playback/Mic-Matching/Tempo-Gating. Build + tsc gruen.

### PLAN-004 — Cyberpunk/Akira Retro-Sync Theme

- **Agent:** `ui-craftsman`
- **Status:** 🟢 done
- **Bereich:** styles,ui
- **Betroffene Dateien:** index.html, App.tsx, modules/ModuleHub.tsx, modules/LickTrainer.tsx

**Ziel:** Neon-Glow, Scanlines, Grid, Glitch-Typo, animierte HUD-Karten und lebendige Module.

**Notizen:**
- Status changed to done at 2026-08-30T19:30:21.423Z.
- Theme umgesetzt: Neon, Scanlines, Grid, Glitch, Cyber-Cards. Build + tsc gruen.

### PLAN-005 — PDF-Import + Akira Cyber Theme

- **Agent:** `audio-engineer`
- **Status:** 🟢 done
- **Bereich:** import,pdf,ui
- **Betroffene Dateien:** core/pdf.ts, modules/LickTrainer.tsx, index.html, package.json, docs/improvisation-studio-concept.md

**Ziel:** PDF-Text-Upload erklaert Licks aus digitalen PDFs; Akira/Neo-Tokyo Akzente.

**Notizen:**
- Status changed to done at 2026-08-30T21:36:14.536Z.
- PDF-Import (M4) und Akira/Neo-Tokyo Akzente umgesetzt. tsc + build gruen.

### PLAN-006 — Enable Improvisation Coach module

- **Agent:** `harmonic-scout-core`
- **Status:** 🟢 done
- **Bereich:** modules,theory
- **Betroffene Dateien:** modules/ImprovisationStudio.tsx, modules/ImprovisationCoach.tsx, core/theory.ts, index.html

**Ziel:** Coach-Modul aktivieren: Live-Key-Detection, Skala/Fretboard-Fuehrung, Challenge-Game.

**Notizen:**
- Status changed to done at 2026-08-31T14:00:08.590Z.
- Coach-Modul aktiv. tsc + build gruen.

### PLAN-007 — Rhythm Jam + Coach milestone extension

- **Agent:** `ui-craftsman`
- **Status:** 🟢 done
- **Bereich:** modules,rhythm,coach
- **Betroffene Dateien:** modules/RhythmJam.tsx, modules/ImprovisationCoach.tsx, modules/ImprovisationStudio.tsx, core/metronome.ts, core/progress.ts, core/useProgress.ts

**Ziel:** Rhythm-Jam-Modul und Coach-Tempo-Ramp bis zum naechsten Meilenstein.

**Notizen:**
- Status changed to done at 2026-08-31T15:33:40.582Z.
- Rhythm Jam + Coach-Tempo-Ramp umgesetzt. tsc + build gruen.

### PLAN-008 — Rhythm Guitar Jam Coach

- **Agent:** `harmonic-scout-core`
- **Status:** 🟢 done
- **Bereich:** harmony,jam-coach
- **Betroffene Dateien:** core/harmony.ts, modules/JamCoach.tsx, modules/ImprovisationStudio.tsx, index.html

**Ziel:** Welche Akkorde passen, wie sie klingen, welche Noten wann und warum - mit Fretboard, Loop und Live-Check.

**Notizen:**
- Status changed to done at 2026-08-31T15:46:33.097Z.
- Jam-Coach umgesetzt: Akkord-Progression, Klaenge, Fretboard, Noten-wann-warum, Live-Check. tsc + build gruen.

### PLAN-009 — Real chord grips + special features

- **Agent:** `harmonic-scout-core`
- **Status:** 🟢 done
- **Bereich:** shapes,chord-diagram,coach
- **Betroffene Dateien:** core/chordShapes.ts, components/ChordDiagram.tsx, modules/JamCoach.tsx

**Ziel:** Echte Griffbilder, wo gespielte Note liegt, Position Finder - plus Sonderideen fuer Projekt-Identitaet.

**Notizen:**
- Status changed to done at 2026-08-31T16:06:24.887Z.
- Echte Akkord-Griffbilder + Position Finder im Jam-Coach umgesetzt. tsc + build gruen.

### PLAN-010 — All growth features + interactive design prototypes

- **Agent:** `ui-craftsman`
- **Status:** 🟢 done
- **Bereich:** design,songs,guide,adaptive,export,feedback
- **Betroffene Dateien:** core/themes.ts, core/useTheme.ts, core/feedbackSound.ts, core/sessionExport.ts, core/songs.ts, core/chordShapes.ts, core/harmony.ts, components/ChordDiagram.tsx, modules/DesignLab.tsx, modules/JamCoach.tsx, modules/RhythmJam.tsx, modules/ImprovisationStudio.tsx, modules/ModuleHub.tsx, App.tsx, index.html

**Ziel:** Song-Fake-Book, Guide-Tone-Routing, Position-Lens, Auditiv-Feedback, adaptives Tempo, Session-Export und interaktive Design-Protypen.

**Notizen:**
- Status changed to done at 2026-08-31T17:02:06.310Z.
- Alle Wachstums-Features + interaktive Design-Protypen umgesetzt. tsc + build gruen.

### PLAN-011 — Theory quiz, ear training, direct theme switcher

- **Agent:** `ui-craftsman`
- **Status:** 🟢 done
- **Bereich:** theory,ear,design
- **Betroffene Dateien:** core/quiz.ts, core/ear.ts, modules/TheoryQuiz.tsx, modules/EarTraining.tsx, modules/ImprovisationStudio.tsx, App.tsx

**Ziel:** Spielerisches Theorie-Quiz und Gehörbildung plus direkt interaktive Design-Protypen im Header.

**Notizen:**
- Status changed to done at 2026-08-31T17:06:26.871Z.
- Theorie-Quiz, Gehörbildung und direkter Theme-Switcher umgesetzt. tsc + build gruen.

### PLAN-012 — Lick-Bibliothek + direkt interaktive Design-Protypen

- **Agent:** `ui-craftsman`
- **Status:** 🟢 done
- **Bereich:** licks,library,design
- **Betroffene Dateien:** core/licks.ts, core/library.ts, modules/LickLibrary.tsx, modules/LickTrainer.tsx, modules/ImprovisationStudio.tsx, modules/DesignLab.tsx, core/themes.ts, index.html

**Ziel:** Lick-Bibliothek mit Genre-Filter, Anhören und Sprung in den Lick-Trainer; DesignLab-Karten und neue Themes direkt per Klick aktivierbar.

**Notizen:**
- Uncommitted, tsc + build gruen.
- Status changed to done at 2026-08-31T18:15:04.456Z.
- Lick-Bibliothek mit Genre-Filter, Vorschau + Sprung in den Lick-Trainer; DesignLab-Karten und 2 neue Themes direkt per Klick aktivierbar. tsc + build gruen.

### PLAN-013 — GitHub setup: repo metadata + v1.0.0 release

- **Agent:** `harmonic-scout-core`
- **Status:** ⚪ released
- **Bereich:** docs,release-ops
- **Betroffene Dateien:** docs/github-setup.md, package.json, package-lock.json, metadata.json, .agent/plans.json, docs/agent-coordination.md

**Ziel:** Create docs/github-setup.md checklist, bump version to 1.0.0, set GitHub description+topics, push cleanup commit, cut v1.0.0 release.

**Notizen:**
- Status changed to done at 2026-09-02T11:57:05.891Z.
- Cleanup-Commit gepusht + v1.0.0 getaggt und als GitHub-Release veroeffentlicht. Repo-Beschreibung/Topics blockiert: Integration-Token ohne Administration-Permission (403 repo edit) — fertige Befehle in docs/github-setup.md.
- Status changed to released at 2026-09-02T12:04:00.856Z.
- PR #2 in main gemergt (Merge-Commit 75adda7). v1.0.0-Commit ab jetzt auf main erreichbar.


## Workflow

1. **Vor dem Editieren:** Dateibereich mit `announce` registrieren.
2. **Vor dem Commit:** `guard` ausführen, um Kollisionen mit aktiven Plänen anderer Agenten zu erkennen.
3. **Status melden:** `update --status blocked|done|released` verwenden, damit andere Agenten Bescheid wissen.
4. **Board aktualisieren:** `dashboard` regeneriert diese Datei.

## Protokoll

Details: [`AGENTS.md`](../AGENTS.md)

