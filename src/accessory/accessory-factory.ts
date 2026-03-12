import { PlatformAccessory } from 'homebridge';
import { CameraConfig } from '../config/types';
import { PublicSpaceCamPlatform } from '../platform';
import { SpaceCameraAccessory } from './space-camera-accessory';

export class AccessoryFactory {
  constructor(private readonly platform: PublicSpaceCamPlatform) {}

  public upsertCamera(config: CameraConfig): PlatformAccessory {
    const uuid = this.platform.api.hap.uuid.generate(`public-spacecam:${config.sourceType}:${config.name}`);
    const existing = this.platform.accessories.get(uuid);

    if (existing) {
      new SpaceCameraAccessory(this.platform, existing, config).update(config);
      this.platform.api.updatePlatformAccessories([existing]);
      return existing;
    }

    const accessory = new this.platform.api.platformAccessory(config.name, uuid);
    accessory.context.cameraName = config.name;
    accessory.context.sourceType = config.sourceType;

    const info = accessory.getService(this.platform.Service.AccessoryInformation)
      ?? accessory.addService(this.platform.Service.AccessoryInformation);
    info
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Community')
      .setCharacteristic(this.platform.Characteristic.Model, 'Public SpaceCam')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${config.sourceType}:${config.name}`)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, '0.1.0');

    const motionService = accessory.getService(this.platform.Service.MotionSensor)
      ?? accessory.addService(this.platform.Service.MotionSensor);
    motionService.setCharacteristic(this.platform.Characteristic.MotionDetected, false);

    // Placeholder camera service indicator for v0 foundation. Full CameraController wiring comes in next phase.
    const switchService = accessory.getService(this.platform.Service.Switch)
      ?? accessory.addService(this.platform.Service.Switch, `${config.name} Status`, 'status-switch');
    switchService.setCharacteristic(this.platform.Characteristic.On, true);

    new SpaceCameraAccessory(this.platform, accessory, config);
    this.platform.api.registerPlatformAccessories(this.platform.pluginName, this.platform.platformName, [accessory]);
    this.platform.accessories.set(uuid, accessory);
    return accessory;
  }

  public removeAccessory(accessory: PlatformAccessory): void {
    this.platform.api.unregisterPlatformAccessories(this.platform.pluginName, this.platform.platformName, [accessory]);
    this.platform.accessories.delete(accessory.UUID);
  }
}
