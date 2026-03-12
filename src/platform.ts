import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import { AccessoryFactory } from './accessory/accessory-factory';
import { validateConfig } from './config/validation';
import { PlatformConfig as SpaceCamPlatformConfig } from './config/types';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export class PublicSpaceCamPlatform implements DynamicPlatformPlugin {
  readonly Service: typeof Service;
  readonly Characteristic: typeof Characteristic;

  readonly accessories = new Map<string, PlatformAccessory>();
  readonly pluginName = PLUGIN_NAME;
  readonly platformName = PLATFORM_NAME;

  private readonly parsedConfig: SpaceCamPlatformConfig;
  private readonly accessoryFactory: AccessoryFactory;

  constructor(
    readonly log: Logger,
    config: PlatformConfig,
    readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    const { value, warnings } = validateConfig(config as SpaceCamPlatformConfig);
    this.parsedConfig = value;
    this.accessoryFactory = new AccessoryFactory(this);

    warnings.forEach((warning) => this.log.warn(`[config] ${warning}`));

    this.api.on('didFinishLaunching', () => {
      this.log.info('Finished launching Public SpaceCam platform.');
      this.syncAccessories();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.set(accessory.UUID, accessory);
  }

  private syncAccessories(): void {
    if (this.parsedConfig.enabled === false) {
      this.log.warn('Plugin disabled via configuration; removing existing accessories.');
      for (const accessory of this.accessories.values()) {
        this.accessoryFactory.removeAccessory(accessory);
      }
      return;
    }

    const enabledCameras = (this.parsedConfig.cameras ?? []).filter((camera) => camera.enabled);
    const expectedUuids = new Set<string>();

    for (const cameraConfig of enabledCameras) {
      const accessory = this.accessoryFactory.upsertCamera(cameraConfig);
      expectedUuids.add(accessory.UUID);
      this.log.info(`Configured camera source: ${cameraConfig.name} (${cameraConfig.sourceType})`);
    }

    for (const accessory of [...this.accessories.values()]) {
      if (!expectedUuids.has(accessory.UUID)) {
        this.log.info(`Removing stale accessory: ${accessory.displayName}`);
        this.accessoryFactory.removeAccessory(accessory);
      }
    }
  }
}
