import { CameraController, CameraControllerOptions, CameraStreamingDelegate, HAP, PrepareStreamCallback, PrepareStreamRequest, SnapshotRequest, SnapshotRequestCallback, StreamingRequest, StreamRequestCallback } from 'homebridge';
export interface FrameProvider {
    getCurrentFramePath(): string | undefined;
}
export interface StreamLog {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
}
export declare class SpaceCamStreamingDelegate implements CameraStreamingDelegate {
    private readonly hap;
    private readonly frameProvider;
    private readonly cameraName;
    private readonly log;
    controller?: CameraController;
    private readonly sessions;
    private readonly ffmpegPath;
    constructor(hap: HAP, frameProvider: FrameProvider, cameraName: string, log: StreamLog, ffmpegPath?: string);
    handleSnapshotRequest(request: SnapshotRequest, callback: SnapshotRequestCallback): void;
    prepareStream(request: PrepareStreamRequest, callback: PrepareStreamCallback): void;
    handleStreamRequest(request: StreamingRequest, callback: StreamRequestCallback): void;
    private startStream;
    private launchFfmpeg;
    private scheduleFrameRefresh;
    private stopStream;
    createCameraControllerOptions(): CameraControllerOptions;
}
