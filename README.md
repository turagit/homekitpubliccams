# homebridge-public-spacecam

A Homebridge plugin that creates synthetic HomeKit camera accessories from NASA's Mars Curiosity rover engineering cameras. Four cameras appear in the Home app — Front, Rear, Left, and Right — each cycling through real images taken by the rover on Mars.

**This is not a live scientific camera.** It is a synthetic camera built from periodically fetched public images via the `mars.nasa.gov` raw images API.

## Available Cameras

| Camera | Instrument | Description |
|--------|-----------|-------------|
| **Front** | Front Hazcam (FHAZ) | Forward-facing hazard avoidance camera |
| **Rear** | Rear Hazcam (RHAZ) | Rear-facing hazard avoidance camera |
| **Left** | Left NavCam | Left navigation camera |
| **Right** | Right NavCam | Right navigation camera |

All cameras refresh every 4 hours by default. No API key is required — the `mars.nasa.gov` endpoint is unauthenticated.

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
cd homekitpubliccams
npm install --prefix /var/lib/homebridge homebridge-public-spacecam-1.0.0.tgz
hb-service restart
```

> **Note:** Homebridge loads plugins from `/var/lib/homebridge/node_modules`, not from the global npm prefix. Using `--prefix /var/lib/homebridge` installs directly into the right location. Do **not** use `npm install -g`.

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

- Add cameras by clicking **Add Camera**
- Choose a rover camera (Front, Rear, Left, Right) and name for each
- Adjust refresh intervals, cache sizes, and display options

### Manual configuration (config.json)

Add this to the `platforms` array in your Homebridge `config.json`:

```json
{
  "platform": "PublicSpaceCamPlatform",
  "name": "Mars Curiosity",
  "cameras": [
    { "name": "Front", "sourceType": "msl-front", "enabled": true },
    { "name": "Rear", "sourceType": "msl-rear", "enabled": true },
    { "name": "Left", "sourceType": "msl-left", "enabled": true },
    { "name": "Right", "sourceType": "msl-right", "enabled": true }
  ]
}
```

### Configuration Options

#### Platform-level

| Option | Default | Description |
|--------|---------|-------------|
| `logLevel` | `info` | `error`, `warn`, `info`, or `debug` |
| `defaultFrameIntervalSec` | `10` | How often the displayed image changes (seconds) |
| `defaultRefreshIntervalSec` | `14400` | How often new images are fetched (seconds, min 300) |

#### Per-camera

| Option | Default | Description |
|--------|---------|-------------|
| `name` | *(required)* | Camera name shown in Home app |
| `sourceType` | *(required)* | `msl-front`, `msl-rear`, `msl-left`, or `msl-right` |
| `enabled` | `true` | Show/hide this camera |
| `frameIntervalSec` | `10` | Override frame change interval |
| `refreshIntervalSec` | `14400` | Override source refresh interval |
| `maxCacheItems` | `50` | Max images cached on disk |
| `maxDiskMb` | `200` | Max disk space for this camera's cache |
| `shuffle` | `false` | Show images in random order |
| `retainLastGood` | `true` | Keep last image if refresh fails |
| `preferLandscape` | `true` | Prefer wider images |

## How It Works

1. The plugin registers as a Homebridge dynamic platform
2. For each enabled camera, it creates a HomeKit camera accessory with a stable UUID
3. A background refresh loop periodically fetches image metadata from `mars.nasa.gov/api/v1/raw_image_items/`
4. New images are downloaded atomically to a local disk cache with bounded eviction
5. A frame scheduler cycles through cached images at the configured interval
6. When you view a camera in the Home app, ffmpeg encodes the current still image as an H.264 video stream over SRTP
7. When the frame scheduler advances to a new image, ffmpeg restarts with the new file

### Architecture

```
Home App
  -> HomeKit Camera Accessory (one per rover camera)
    -> CameraController (HAP-NodeJS)
      -> SpaceCamStreamingDelegate
        -> ffmpeg (H.264/SRTP encoding)
        -> SnapshotProvider (current frame JPEG)
      -> FrameScheduler (image sequencing)
      -> CacheManager (disk-backed, bounded)
        -> MslRawSource (mars.nasa.gov API)
```

## Storage

Cached images are stored under your Homebridge storage directory:

```
<homebridge-storage>/public-spacecam/
  sources/
    msl-front/
      assets/       # Downloaded images
      index.json    # Cache metadata
    msl-rear/
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
- Check that the camera is enabled in config
- Check Homebridge logs for source refresh errors
- Verify your Homebridge host can reach `mars.nasa.gov`

**Stream is slow to start:**
- First stream start may take a few seconds while ffmpeg initializes
- This is normal for still-image-based synthetic cameras

**High CPU usage:**
- ffmpeg runs only while someone is actively viewing the camera
- If no one is viewing, CPU usage should be near zero
- Reduce resolution or FPS in your HomeKit client settings if needed

## Limitations

- These are synthetic camera feeds, not live scientific streams
- Rover photos may be days or weeks old depending on downlink schedules
- No audio support
- No HomeKit Secure Video recording
- No PTZ (pan/tilt/zoom) controls

## Legal

- Images are sourced from NASA/JPL-Caltech via `mars.nasa.gov`
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
