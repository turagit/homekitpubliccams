# homebridge-public-spacecam

A Homebridge dynamic platform plugin that aims to expose synthetic HomeKit camera feeds built from public space imagery.

## Current implementation status

This repository now includes a stronger foundation layer:

- dynamic platform registration and accessory synchronization
- schema-driven configuration (`config.schema.json`)
- typed configuration with runtime normalization, clamping, and duplicate detection
- source adapter contract + source factory mapping
- cache manager with dedupe + invalid-asset pruning + bounded eviction
- frame scheduler with selectable ordering mode (`sequential`, `shuffle`, `newest-first`)
- scaffolding for streaming sessions, diagnostics, image utilities, and networking

## Architectural gaps still to complete

- HomeKit `CameraController` + RTP video transport implementation
- real HTTP fetch/download + MIME/decoder validation
- persistent on-disk cache + startup recovery
- snapshots backed by current frame buffer
- backoff/rate-limit governor across enabled sources

## Codebase improvements applied in this revision

1. **Config hardening**
   - clamps and normalizes numeric fields safely
   - trims camera names
   - warns on duplicate `<sourceType>:<name>` camera keys
   - enforces conservative refresh floor
2. **Source abstraction cleanup**
   - introduced `BaseSourceAdapter` with `validateConfig` contract
   - introduced `createSourceAdapter` factory for deterministic source construction
3. **Cache correctness**
   - dedupes by `assetId`
   - removes invalid assets before counting toward limits
   - retains newest entries under max item count
4. **Scheduler flexibility**
   - adds order modes and reset support for deterministic behavior in tests

## Recommended next steps

- Implement real camera streaming (likely hybrid with ffmpeg at the transport edge for compatibility).
- Replace in-memory cache with disk-backed `index.json` + atomic temp-file workflow.
- Add unit tests for config validation, cache eviction/dedupe, and frame scheduler ordering.
- Add source-specific adapters with mocked HTTP integration tests.

## Development

```bash
npm install
npm run check
npm run build
```
