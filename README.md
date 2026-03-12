# homekitpubliccams

## Streaming backends

The camera pipeline supports two encoder backends:

- **`internal` (preferred):** uses the in-process encoder/packetizer path when capability probe succeeds at startup.
- **`ffmpeg` (compatibility):** uses an `ffmpeg` subprocess to package RTP/H.264. This path is the guaranteed fallback for broad platform compatibility.

### Backend selection and fallback

`src/camera/session-manager.ts` runs a startup capability probe (`canUseInternalEncoder()`) and stores the preferred backend for session creation.

If a session start fails while using `internal`, the session manager retries once with `ffmpeg` before returning an error.

### Codec/profile constraints

For HomeKit RTP interoperability, current constraints are:

- codec: `h264`
- packetization mode: `1`
- H.264 profile: `baseline`, `main`, or `high`
- H.264 level: `3.1` or `4.0`

If constraints cannot be met with `internal`, the fallback backend (`ffmpeg`) is used when available.
