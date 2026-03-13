import { CameraController, PlatformAccessory } from 'homebridge';
import { CameraConfig } from '../config/types';
import { SnapshotProvider } from '../camera/snapshot-provider';
import { SpaceCamStreamingDelegate } from '../camera/stream-controller';
import { PublicSpaceCamPlatform } from '../platform';
export declare class SpaceCameraAccessory {
    private readonly platform;
    private readonly accessory;
    readonly cameraConfig: CameraConfig;
    readonly snapshotProvider: SnapshotProvider;
    readonly streamingDelegate: SpaceCamStreamingDelegate;
    readonly cameraController: CameraController;
    constructor(platform: PublicSpaceCamPlatform, accessory: PlatformAccessory, cameraConfig: CameraConfig);
    update(cameraConfig: CameraConfig): void;
}
