import { CameraController, PlatformAccessory } from 'homebridge';
import { CameraConfig } from '../config/types';
import { SnapshotProvider } from '../camera/snapshot-provider';
import { SpaceCamStreamingDelegate } from '../camera/stream-controller';
import { PublicSpaceCamPlatform } from '../platform';

export class SpaceCameraAccessory {
  public readonly snapshotProvider: SnapshotProvider;
  public readonly streamingDelegate: SpaceCamStreamingDelegate;
  public readonly cameraController: CameraController;

  constructor(
    private readonly platform: PublicSpaceCamPlatform,
    private readonly accessory: PlatformAccessory,
    readonly cameraConfig: CameraConfig,
  ) {
    this.accessory.context.sourceType = cameraConfig.sourceType;
    this.accessory.context.cameraName = cameraConfig.name;

    this.snapshotProvider = new SnapshotProvider();

    this.streamingDelegate = new SpaceCamStreamingDelegate(
      this.platform.api.hap,
      this.snapshotProvider,
      cameraConfig.name,
      this.platform.log,
    );

    const controllerOptions = this.streamingDelegate.createCameraControllerOptions();
    this.cameraController = new this.platform.api.hap.CameraController(controllerOptions);
    this.streamingDelegate.controller = this.cameraController;

    this.accessory.configureController(this.cameraController);
  }

  public update(cameraConfig: CameraConfig): void {
    this.accessory.context.sourceType = cameraConfig.sourceType;
    this.accessory.context.cameraName = cameraConfig.name;
    this.platform.log.debug(`Updated camera accessory: ${cameraConfig.name}`);
  }
}
