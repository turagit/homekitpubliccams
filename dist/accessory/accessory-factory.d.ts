import { PlatformAccessory } from 'homebridge';
import { CameraConfig } from '../config/types';
import { PublicSpaceCamPlatform } from '../platform';
import { SpaceCameraAccessory } from './space-camera-accessory';
export declare class AccessoryFactory {
    private readonly platform;
    private readonly cameraAccessories;
    constructor(platform: PublicSpaceCamPlatform);
    upsertCamera(config: CameraConfig): PlatformAccessory;
    getCameraAccessory(uuid: string): SpaceCameraAccessory | undefined;
    getAllCameraAccessories(): SpaceCameraAccessory[];
    removeAccessory(accessory: PlatformAccessory): void;
}
