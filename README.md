# homebridge-public-spacecam

A Homebridge plugin that creates synthetic HomeKit camera accessories from public NASA and space imagery. Each camera source appears as a separate camera in the Home app, cycling through periodically refreshed still images that look like a slow-moving visual feed.

**This is not a live scientific camera.** It is a synthetic camera built from periodically fetched public images.

## Available Camera Sources

| Source | Description | Refresh Rate |
|--------|-------------|--------------|
| **Curiosity Rover** | Latest photos from NASA's Curiosity Mars rover | ~15 min |
| **Perseverance Rover** | Latest photos from NASA's Perseverance Mars rover | ~15 min |
| **JWST** | James Webb Space Telescope public release images | ~2 hours |
| **Hubble** | Hubble Space Telescope public release images | ~2 hours |
| **APOD** | Astronomy Picture of the Day | ~6 hours |
| **NASA Mixed Feed** | Rotating search across NASA's Image Library (galaxies, nebulae, Earth, etc.) | ~30 min |

## Prerequisites

- **Homebridge** v1.8.0 or later
- **Node.js** v18 or later
- **ffmpeg** installed on the Homebridge host (required for video streaming)

### Installing ffmpeg

ffmpeg is required to encode still images into the H.264 video stream that HomeKit expects.

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Debian/Ubuntu (including Raspberry Pi):**
```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
```

**Homebridge Docker (official image):**
ffmpeg is pre-installed in the official `homebridge/homebridge` Docker image.

**Verify installation:**
```bash
ffmpeg -version
```

## Installation

### From this repository (simplest — no build step required)

A pre-built package is included in this repo. Clone and install directly:

```bash
# On the Homebridge host (Linux VM, Raspberry Pi, etc.)
git clone https://github.com/turagit/homekitpubliccams.git
sudo npm install -g ./homekitpubliccams/homebridge-public-spacecam-1.0.0.tgz
```

Then restart Homebridge.

### From Homebridge UI

1. Open the Homebridge web UI
2. Go to the **Plugins** tab
3. Search for `homebridge-public-spacecam`
4. Click **Install**

### From the command line (npm registry)

```bash
sudo npm install -g homebridge-public-spacecam
```

### From a local checkout (development)

```bash
cd homebridge-public-spacecam
npm install
npm run build
sudo npm link
```

## Configuration

### Using the Homebridge UI (recommended)

After installing, go to the **Plugins** tab in the Homebridge UI and click **Settings** on Public SpaceCam. The configuration form lets you:

- Enter an optional NASA API key
- Add cameras by clicking **Add Camera**
- Choose a source and name for each camera
- Adjust refresh intervals, cache sizes, and display options

### Manual configuration (config.json)

Add this to the `platforms` array in your Homebridge `config.json`:

```json
{
  "platform": "PublicSpaceCamPlatform",
  "name": "Public SpaceCam",
  "apiKey": "YOUR_NASA_API_KEY",
  "cameras": [
    {
      "name": "Mars Curiosity",
      "sourceType": "curiosity",
      "enabled": true
    },
    {
      "name": "Astronomy Picture of the Day",
      "sourceType": "apod",
      "enabled": true
    },
    {
      "name": "James Webb Telescope",
      "sourceType": "jwst",
      "enabled": true
    },
    {
      "name": "Hubble",
      "sourceType": "hubble",
      "enabled": true
    },
    {
      "name": "NASA Space Cam",
      "sourceType": "nasa-mixed",
      "enabled": true,
      "shuffle": true
    }
  ]
}
```

### NASA API Key

The plugin works without a key using NASA's `DEMO_KEY`, but this is severely rate-limited (30 requests/hour, 50/day per IP). For normal use, get a free API key at **https://api.nasa.gov** — it takes 10 seconds and gives you 1,000 requests/hour.

### Configuration Options

#### Platform-level

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | `DEMO_KEY` | Your NASA API key |
| `logLevel` | `info` | `error`, `warn`, `info`, or `debug` |
| `defaultFrameIntervalSec` | `10` | How often the displayed image changes (seconds) |
| `defaultRefreshIntervalSec` | `900` | How often new images are fetched (seconds, min 300) |

#### Per-camera

| Option | Default | Description |
|--------|---------|-------------|
| `name` | *(required)* | Camera name shown in Home app |
| `sourceType` | *(required)* | `curiosity`, `perseverance`, `jwst`, `hubble`, `apod`, or `nasa-mixed` |
| `enabled` | `true` | Show/hide this camera |
| `frameIntervalSec` | `10` | Override frame change interval |
| `refreshIntervalSec` | `900` | Override source refresh interval |
| `maxCacheItems` | `50` | Max images cached on disk |
| `maxDiskMb` | `200` | Max disk space for this camera's cache |
| `shuffle` | `false` | Show images in random order |
| `retainLastGood` | `true` | Keep last image if refresh fails |
| `preferLandscape` | `true` | Prefer wider images |

## How It Works

1. The plugin registers as a Homebridge dynamic platform
2. For each enabled camera, it creates a HomeKit camera accessory with a stable UUID
3. A background refresh loop periodically fetches image metadata from NASA APIs
4. New images are downloaded atomically to a local disk cache with bounded eviction
5. A frame scheduler cycles through cached images at the configured interval
6. When you view a camera in the Home app, ffmpeg encodes the current still image as an H.264 video stream over SRTP
7. When the frame scheduler advances to a new image, ffmpeg restarts with the new file

### Architecture

```
Home App
  -> HomeKit Camera Accessory (one per source)
    -> CameraController (HAP-NodeJS)
      -> SpaceCamStreamingDelegate
        -> ffmpeg (H.264/SRTP encoding)
        -> SnapshotProvider (current frame JPEG)
      -> FrameScheduler (image sequencing)
      -> CacheManager (disk-backed, bounded)
        -> Source Adapter (NASA API client)
          -> NASA/STScI/HubbleSite APIs
```

## Storage

Cached images are stored under your Homebridge storage directory:

```
<homebridge-storage>/public-spacecam/
  sources/
    curiosity/
      assets/       # Downloaded images
      index.json    # Cache metadata
    apod/
      assets/
      index.json
    ...
```

Storage is bounded per camera by `maxCacheItems` and `maxDiskMb`. Old images are automatically evicted. Temporary download files are cleaned up on startup.

## Troubleshooting

**Camera shows "No Response" in Home app:**
- Verify ffmpeg is installed: `ffmpeg -version`
- Check Homebridge logs for errors
- Set `logLevel` to `debug` for detailed output

**No images appearing:**
- If using `DEMO_KEY`, you may have hit rate limits. Get a free key at https://api.nasa.gov
- Check that the camera is enabled in config
- Check Homebridge logs for source refresh errors

**Stream is slow to start:**
- First stream start may take a few seconds while ffmpeg initializes
- This is normal for still-image-based synthetic cameras

**High CPU usage:**
- ffmpeg runs only while someone is actively viewing the camera
- If no one is viewing, CPU usage should be near zero
- Reduce resolution or FPS in your HomeKit client settings if needed

## Limitations

- These are synthetic camera feeds, not live scientific streams
- Image update frequency depends on the source (rover photos may be days old)
- No audio support
- No HomeKit Secure Video recording
- No PTZ (pan/tilt/zoom) controls
- JWST and Hubble sources may fall back to NASA Image Library search if primary APIs are unavailable

## Legal

- Images are sourced from public NASA, ESA, STScI, and related endpoints
- NASA content is generally not subject to copyright for informational/educational use
- This is an **unofficial community plugin** — not affiliated with or endorsed by NASA
- NASA insignia and logos are not used in this plugin
- Source attribution metadata is preserved in cache indexes

## Development

```bash
npm install
npm run build
npm run check     # type-check only
npm test          # run unit tests
```

## License

MIT
