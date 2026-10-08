# AGENTS.md — homekitpubliccams (Homebridge plugin: Mars rover cams in HomeKit)

`homebridge-public-spacecam`, a Homebridge plugin that turns NASA Mars rover
engineering cameras (Curiosity hazcams and navcams, Perseverance front
hazcams) into **synthetic** HomeKit cameras. It periodically fetches public
stills from the unauthenticated `mars.nasa.gov` raw-images API (every 4 hours
by default) and ffmpeg encodes them into the H.264 stream HomeKit expects.
Not a live camera. TypeScript, Node 18+, Homebridge 1.8+. Version 1.0.0.

## Repo map

- `src/platform.ts`, `src/index.ts`, `src/settings.ts` — plugin entry and
  platform registration.
- `src/sources/` — per-rover/camera source types (`msl-front`, `m20-front-left`…).
- `src/net/`, `src/image/`, `src/cache/`, `src/frame/` — fetch, validate,
  cache with eviction, frame scheduling.
- `src/camera/`, `src/accessory/` — the HomeKit camera accessory and ffmpeg
  streaming. `src/config/`, `src/diag/`, `src/util/` — config, diagnostics.
- `test/*.test.ts` — Jest suite (cache, eviction, scheduler, validator,
  source factory, config validation).
- `config.schema.json` — the Homebridge UI config form.
- `dist/` and `homebridge-public-spacecam-1.0.0.tgz` — **committed build
  output**; the README installs from the `.tgz`.

## Commands

```bash
npm install
npm test            # jest, 6 suites / 38 tests
npm run check       # tsc --noEmit
npm run build       # tsc → dist/
npm pack            # refresh the .tgz after a build
# On the Homebridge host
npm install --prefix /var/lib/homebridge homebridge-public-spacecam-1.0.0.tgz && hb-service restart
```

## Hard rules

- `node_modules/` is committed (no `.gitignore`), so `npm install` can change
  tracked files. Check `git status` afterwards and don't commit dependency
  churn by accident.
- `dist/` and the `.tgz` ship from the repo. After a source change, rebuild
  and re-pack them in the same commit, or the README install path ships stale
  code.
- Install into `/var/lib/homebridge` with `--prefix`; Homebridge does not load
  plugins from the global npm prefix.
- Keep it keyless: the NASA endpoint needs no API key, and none goes in config
  or code.
- Never describe the cameras as live in UI text or docs.

## Agent skills

### Issue tracker

Issues live in GitHub. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
