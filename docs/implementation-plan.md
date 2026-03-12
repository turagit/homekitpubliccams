# Streaming Backend Implementation Plan

## Goal

Support dual encoder backends in streaming with robust per-session fallback.

## Plan

1. Add backend abstraction in `src/camera/stream-controller.ts` with:
   - `internal` backend implementation (preferred path),
   - `ffmpeg` subprocess backend for RTP/H.264 packaging.
2. Add startup capability probe in `src/camera/session-manager.ts`:
   - Detect whether internal encoder path is available.
   - Persist preferred backend for session starts.
3. Add runtime fallback:
   - If internal backend fails when starting a session, automatically retry the session with ffmpeg.
4. Document codec/profile constraints and backend behavior in:
   - `README.md`,
   - `config.schema.json` help text,
   - streaming spec.
5. Validate behavior with static checks and TypeScript compile in CI-enabled repositories.

## Constraints

- Keep RTP video path H.264-only for HomeKit interoperability.
- Restrict packetization mode to `1`.
- Restrict profile to `baseline|main|high` and level to `3.1|4.0` unless future compatibility testing expands support.
