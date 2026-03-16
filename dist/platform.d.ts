import { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
export declare class PublicSpaceCamPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: Map<string, PlatformAccessory<import("homebridge").UnknownContext>>;
    readonly pluginName = "homebridge-public-spacecam";
    readonly platformName = "PublicSpaceCamPlatform";
    private readonly parsedConfig;
    private readonly accessoryFactory;
    private readonly cacheManager;
    private readonly downloader;
    private readonly imageValidator;
    private readonly diagnostics;
    private readonly runtimes;
    private readonly storagePath;
    constructor(log: Logger, config: PlatformConfig, api: API);
    configureAccessory(accessory: PlatformAccessory): void;
    private syncAccessories;
    private startRefreshLoop;
    private startFrameLoop;
    private refreshSource;
    private advanceFrame;
    private guessExtension;
    private stopRuntime;
    private shutdown;
}
