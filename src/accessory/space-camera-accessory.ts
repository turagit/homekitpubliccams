import { PlatformAccessory } from 'homebridge';
import { CameraConfig } from '../config/types';
import { PublicSpaceCamPlatform } from '../platform';

export class SpaceCameraAccessory {
  constructor(
    private readonly platform: PublicSpaceCamPlatform,
    private readonly accessory: PlatformAccessory,
    readonly cameraConfig: CameraConfig,
  ) {
    this.accessory.context.sourceType = cameraConfig.sourceType;
    this.accessory.context.cameraName = cameraConfig.name;
  }

  public update(cameraConfig: CameraConfig): void {
    this.accessory.context.sourceType = cameraConfig.sourceType;
    this.accessory.context.cameraName = cameraConfig.name;
    this.platform.log.debug(`Updated camera accessory: ${cameraConfig.name}`);
  }
}
