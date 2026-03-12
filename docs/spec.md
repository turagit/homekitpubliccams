# Camera Streaming Specification

## Streaming

The camera streaming subsystem MUST support two encoder backends in `src/camera/stream-controller.ts`:

1. **Preferred internal encoder path** (selected when startup capability probe confirms availability).
2. **Guaranteed compatibility path** using an `ffmpeg` subprocess for RTP/H.264 packaging.

### Backend selection

- A startup capability probe in `src/camera/session-manager.ts` determines the preferred backend.
- The selection is applied to each session.
- If a session fails to start with the internal encoder, the implementation MUST retry with the ffmpeg backend before surfacing an error.

### Codec and profile constraints

- Video codec MUST be H.264.
- RTP packetization mode MUST be `1`.
- Supported H.264 profiles: `baseline`, `main`, `high`.
- Supported levels for current implementation: `3.1`, `4.0`.

### Operational behavior

- The internal backend is prioritized to reduce process overhead and improve startup latency.
- The ffmpeg backend is the compatibility guarantee and must remain available when `ffmpeg` is installed and executable.
