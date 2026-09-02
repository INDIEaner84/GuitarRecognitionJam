# GitHub Setup — Repo-Metadaten & Release v1.0.0

> Checkliste für das initiale GitHub-Setup von **Harmonic Scout**
> (`INDIEaner84/GuitarRecognitionJam`). Ausgeführt im Cleanup-Commit vor dem
> v1.0.0 Release (siehe PLAN-013 in `.agent/plans.json`).

## 1. Repo-Beschreibung + Topics

Beschreibung und Topics werden über die GitHub CLI gesetzt:

```bash
gh repo edit INDIEaner84/GuitarRecognitionJam \
  --description "🎸 Harmonic Scout — Cyberpunk/Akira-Style Gitarren-Trainer: Live-Pitch- & Akkorderkennung per Mikrofon, Lick-Trainer, Improvisations-Coach, Rhythm Jam & Gehörbildung — komplett lokal im Browser (React 19, TypeScript, Vite, Tone.js)." \
  --add-topic guitar \
  --add-topic guitar-trainer \
  --add-topic music \
  --add-topic music-theory \
  --add-topic pitch-detection \
  --add-topic web-audio \
  --add-topic tonejs \
  --add-topic react \
  --add-topic typescript \
  --add-topic vite \
  --add-topic improvisation \
  --add-topic ear-training
```

Verifikation:

```bash
gh repo view --json description,repositoryTopics
```

## 2. Cleanup-Commit

Aufräumen vor dem Release:

- [x] `package.json` + `package-lock.json`: Version `0.0.0` → `1.0.0`
- [x] `metadata.json`: Beschreibung an den aktuellen Funktionsumfang angeglichen
- [x] Diese Checkliste (`docs/github-setup.md`) angelegt
- [x] Verifikation: `npx tsc --noEmit` + `npm run build` grün

Commit & Push:

```bash
git add -A
git commit -m "chore(release): prep v1.0.0 — version bump, metadata cleanup, github-setup doc"
git push origin arena/01a061f6-guitarrecognitionjam
```

## 3. Release v1.0.0

Tag auf dem Cleanup-Commit setzen, pushen und GitHub-Release anlegen:

```bash
git tag -a v1.0.0 -m "Harmonic Scout v1.0.0 — first stable release"
git push origin v1.0.0

gh release create v1.0.0 \
  --title "v1.0.0 — Harmonic Scout 🎸" \
  --notes-file <release-notes.md>
```

### Release Notes (Kurzfassung)

- **Lick-Trainer** mit Mikrofon-Matching, PDF-Import (Textebene) und Tempo-Gating
- **Lick-Bibliothek** (Blues, Rock, Jazz, Folk, Metal, Reggae) mit Genre-Filter
- **Improvisations-Coach** mit Live-Tonarterkennung, Fretboard-Führung, Tempo-Ramp
- **Rhythm-Guitar Coach & Rhythm Jam** inkl. echter Akkord-Griffbilder
- **Theorie-Quiz & Gehörbildung** mit Tone.js-Playback
- **Design-Lab**: 7 direkt umschaltbare Themes (Neo-Tokyo, Vaporwave, …)
- Lokale Gamification (XP, Level, Streak) + Session-Export als JSON
- Agenten-Koordinationsschicht (`.agent/plans.json` + CLI + Dashboard)

## 4. Nach dem Release

```bash
node scripts/agent-coordination.mjs update --plan PLAN-013 --status released \
  --note "v1.0.0 getaggt und auf GitHub veroeffentlicht."
node scripts/agent-coordination.mjs dashboard
git add -A && git commit -m "docs: PLAN-013 released (v1.0.0)" && git push
```
