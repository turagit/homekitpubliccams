"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceCameraAccessory = void 0;
const snapshot_provider_1 = require("../camera/snapshot-provider");
const stream_controller_1 = require("../camera/stream-controller");
class SpaceCameraAccessory {
    platform;
    accessory;
    cameraConfig;
    snapshotProvider;
    streamingDelegate;
    cameraController;
    constructor(platform, accessory, cameraConfig) {
        this.platform = platform;
        this.accessory = accessory;
        this.cameraConfig = cameraConfig;
        this.accessory.context.sourceType = cameraConfig.sourceType;
        this.accessory.context.cameraName = cameraConfig.name;
        this.snapshotProvider = new snapshot_provider_1.SnapshotProvider();
        this.streamingDelegate = new stream_controller_1.SpaceCamStreamingDelegate(this.platform.api.hap, this.snapshotProvider, cameraConfig.name, this.platform.log);
        const controllerOptions = this.streamingDelegate.createCameraControllerOptions();
        this.cameraController = new this.platform.api.hap.CameraController(controllerOptions);
        this.streamingDelegate.controller = this.cameraController;
        this.accessory.configureController(this.cameraController);
    }
    update(cameraConfig) {
        this.accessory.context.sourceType = cameraConfig.sourceType;
        this.accessory.context.cameraName = cameraConfig.name;
        this.platform.log.debug(`Updated camera accessory: ${cameraConfig.name}`);
    }
}
exports.SpaceCameraAccessory = SpaceCameraAccessory;
