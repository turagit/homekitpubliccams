import { PlatformAccessory } from 'homebridge';
import { CameraConfig } from '../config/types';
import { PublicSpaceCamPlatform } from '../platform';
import { SpaceCameraAccessory } from './space-camera-accessory';

export class AccessoryFactory {
  private readonly cameraAccessories = new Map<string, SpaceCameraAccessory>();

  constructor(private readonly platform: PublicSpaceCamPlatform) {}

  public upsertCamera(config: CameraConfig): PlatformAccessory {
    const uuid = this.platform.api.hap.uuid.generate(`public-spacecam:${config.sourceType}:${config.name}`);
    const existing = this.platform.accessories.get(uuid);

    if (existing) {
      if (existing.displayName !== config.name) {
        existing.displayName = config.name;
      }

      // Reuse or create SpaceCameraAccessory
      let cam = this.cameraAccessories.get(uuid);
      if (!cam) {
        cam = new SpaceCameraAccessory(this.platform, existing, config);
        this.cameraAccessories.set(uuid, cam);
      } else {
        cam.update(config);
      }

      this.platform.api.updatePlatformAccessories([existing]);
      return existing;
    }

    const accessory = new this.platform.api.platformAccessory(config.name, uuid);
    accessory.context.cameraName = config.name;
    accessory.context.sourceType = config.sourceType;

    const info = accessory.getService(this.platform.Service.AccessoryInformation)
      ?? accessory.addService(this.platform.Service.AccessoryInformation);
    info
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Public SpaceCam')
      .setCharacteristic(this.platform.Characteristic.Model, config.sourceType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${config.sourceType}:${config.name}`)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, '1.0.0');

    const cam = new SpaceCameraAccessory(this.platform, accessory, config);
    this.cameraAccessories.set(uuid, cam);

    this.platform.api.registerPlatformAccessories(this.platform.pluginName, this.platform.platformName, [accessory]);
    this.platform.accessories.set(uuid, accessory);
    return accessory;
  }

  public getCameraAccessory(uuid: string): SpaceCameraAccessory | undefined {
    return this.cameraAccessories.get(uuid);
  }

  public getAllCameraAccessories(): SpaceCameraAccessory[] {
    return [...this.cameraAccessories.values()];
  }

  public removeAccessory(accessory: PlatformAccessory): void {
    this.platform.api.unregisterPlatformAccessories(this.platform.pluginName, this.platform.platformName, [accessory]);
    this.platform.accessories.delete(accessory.UUID);
    this.cameraAccessories.delete(accessory.UUID);
  }
}
