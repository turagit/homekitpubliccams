# homebridge-public-spacecam

Foundation implementation of a Homebridge dynamic platform plugin that will expose synthetic HomeKit camera feeds built from public space imagery.

## Current status

This commit provides:

- dynamic platform registration
- schema-driven configuration (`config.schema.json`)
- typed configuration and runtime normalization
- accessory lifecycle management (create/update/remove)
- scaffolding for cache, scheduler, source adapters, diagnostics, and streaming session management

## Not yet implemented

- HomeKit CameraController stream transport
- real source fetching/downloading
- persistent on-disk cache
- snapshot delivery

## Development

```bash
npm install
npm run check
npm run build
```
