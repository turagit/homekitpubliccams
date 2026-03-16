"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceCamStreamingDelegate = void 0;
const node_child_process_1 = require("node:child_process");
const node_dgram_1 = require("node:dgram");
class SpaceCamStreamingDelegate {
    hap;
    frameProvider;
    cameraName;
    log;
    controller;
    sessions = new Map();
    ffmpegPath;
    constructor(hap, frameProvider, cameraName, log, ffmpegPath) {
        this.hap = hap;
        this.frameProvider = frameProvider;
        this.cameraName = cameraName;
        this.log = log;
        this.ffmpegPath = ffmpegPath || 'ffmpeg';
    }
    handleSnapshotRequest(request, callback) {
        const framePath = this.frameProvider.getCurrentFramePath();
        if (!framePath) {
            callback(new Error('No frame available'));
            return;
        }
        const args = [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', framePath,
            '-vf', `scale=${request.width}:${request.height}:force_original_aspect_ratio=decrease,pad=${request.width}:${request.height}:(ow-iw)/2:(oh-ih)/2:black`,
            '-frames:v', '1',
            '-f', 'image2',
            '-codec:v', 'mjpeg',
            '-q:v', '5',
            'pipe:1',
        ];
        const ffmpeg = (0, node_child_process_1.spawn)(this.ffmpegPath, args);
        const chunks = [];
        ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
        ffmpeg.stderr.on('data', () => { });
        ffmpeg.on('close', (code) => {
            if (code === 0 && chunks.length > 0) {
                callback(undefined, Buffer.concat(chunks));
            }
            else {
                callback(new Error(`ffmpeg snapshot exited with code ${code}`));
            }
        });
        ffmpeg.on('error', (err) => {
            callback(err);
        });
    }
    prepareStream(request, callback) {
        const sessionId = request.sessionID;
        const videoSocket = (0, node_dgram_1.createSocket)('udp4');
        videoSocket.on('error', (err) => {
            this.log.error(`[${this.cameraName}] UDP socket error: ${err.message}`);
            callback(err);
        });
        // bind(0) is async — wait for 'listening' before calling .address()
        videoSocket.bind(0, () => {
            const returnVideoPort = videoSocket.address().port;
            const videoSsrc = this.hap.CameraController.generateSynchronisationSource();
            const session = {
                id: sessionId,
                videoPort: request.video.port,
                videoSrtpKey: request.video.srtp_key,
                videoSrtpSalt: request.video.srtp_salt,
                videoSsrc,
                targetAddress: request.targetAddress,
                returnVideoPort,
                videoSocket,
                width: 1280,
                height: 720,
                fps: 2,
                bitrate: 512,
            };
            this.sessions.set(sessionId, session);
            const response = {
                video: {
                    port: returnVideoPort,
                    ssrc: videoSsrc,
                    srtp_key: request.video.srtp_key,
                    srtp_salt: request.video.srtp_salt,
                },
            };
            callback(undefined, response);
        });
    }
    handleStreamRequest(request, callback) {
        const sessionId = request.sessionID;
        if (request.type === "start" /* StreamRequestTypes.START */) {
            const startReq = request;
            const session = this.sessions.get(sessionId);
            if (session) {
                session.width = startReq.video.width;
                session.height = startReq.video.height;
                session.fps = Math.min(startReq.video.fps, 2);
                session.bitrate = startReq.video.max_bit_rate;
            }
            this.startStream(sessionId);
            callback();
        }
        else if (request.type === "stop" /* StreamRequestTypes.STOP */) {
            this.stopStream(sessionId);
            callback();
        }
        else {
            callback();
        }
    }
    startStream(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return;
        }
        const framePath = this.frameProvider.getCurrentFramePath();
        if (!framePath) {
            this.log.warn(`[${this.cameraName}] No frame available to stream`);
            return;
        }
        this.launchFfmpeg(session, framePath);
        this.scheduleFrameRefresh(session);
    }
    launchFfmpeg(session, framePath) {
        const srtpParams = Buffer.concat([session.videoSrtpKey, session.videoSrtpSalt]).toString('base64');
        const { width, height, fps, bitrate } = session;
        const args = [
            '-hide_banner',
            '-loglevel', 'warning',
            '-loop', '1',
            '-f', 'image2',
            '-framerate', String(fps),
            '-i', framePath,
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
            '-codec:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-b:v', `${bitrate}k`,
            '-maxrate', `${bitrate}k`,
            '-bufsize', `${bitrate * 2}k`,
            '-pix_fmt', 'yuv420p',
            '-profile:v', 'baseline',
            '-level', '3.1',
            '-g', String(fps),
            '-force_key_frames', 'expr:gte(t,0)',
            '-an',
            '-payload_type', '99',
            '-ssrc', String(session.videoSsrc),
            '-f', 'rtp',
            '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
            '-srtp_out_params', srtpParams,
            `srtp://${session.targetAddress}:${session.videoPort}?rtcpport=${session.videoPort}&pkt_size=1316`,
        ];
        this.log.info(`[${this.cameraName}] Starting stream: ${width}x${height}@${fps}fps, ssrc=${session.videoSsrc}`);
        const ffmpeg = (0, node_child_process_1.spawn)(this.ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        session.ffmpeg = ffmpeg;
        ffmpeg.stderr?.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) {
                this.log.info(`[${this.cameraName}] ffmpeg: ${msg}`);
            }
        });
        ffmpeg.on('error', (err) => {
            this.log.error(`[${this.cameraName}] ffmpeg error: ${err.message}`);
        });
        ffmpeg.on('close', (code) => {
            this.log.info(`[${this.cameraName}] ffmpeg exited with code ${code}`);
            session.ffmpeg = undefined;
        });
    }
    scheduleFrameRefresh(session) {
        let lastFramePath = this.frameProvider.getCurrentFramePath();
        session.refreshTimer = setInterval(() => {
            if (!this.sessions.has(session.id)) {
                if (session.refreshTimer) {
                    clearInterval(session.refreshTimer);
                }
                return;
            }
            const currentFrame = this.frameProvider.getCurrentFramePath();
            if (currentFrame && currentFrame !== lastFramePath) {
                lastFramePath = currentFrame;
                this.log.debug(`[${this.cameraName}] Frame changed, restarting ffmpeg`);
                // Kill old ffmpeg, launch new one with updated frame
                if (session.ffmpeg && !session.ffmpeg.killed) {
                    session.ffmpeg.kill('SIGTERM');
                }
                setTimeout(() => {
                    if (this.sessions.has(session.id) && currentFrame) {
                        this.launchFfmpeg(session, currentFrame);
                    }
                }, 500);
            }
        }, 10_000);
    }
    stopStream(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            this.log.info(`[${this.cameraName}] Stopping stream`);
            if (session.refreshTimer) {
                clearInterval(session.refreshTimer);
            }
            if (session.ffmpeg && !session.ffmpeg.killed) {
                session.ffmpeg.kill('SIGTERM');
                setTimeout(() => {
                    if (session.ffmpeg && !session.ffmpeg.killed) {
                        session.ffmpeg.kill('SIGKILL');
                    }
                }, 5000);
            }
            try {
                session.videoSocket.close();
            }
            catch {
                // ignore
            }
            this.sessions.delete(sessionId);
        }
    }
    createCameraControllerOptions() {
        return {
            cameraStreamCount: 2,
            delegate: this,
            streamingOptions: {
                supportedCryptoSuites: [0 /* this.hap.SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80 */],
                video: {
                    resolutions: [
                        [1920, 1080, 15],
                        [1280, 720, 15],
                        [640, 480, 15],
                        [640, 360, 15],
                        [480, 360, 15],
                        [320, 240, 15],
                    ],
                    codec: {
                        profiles: [0 /* this.hap.H264Profile.BASELINE */, 1 /* this.hap.H264Profile.MAIN */],
                        levels: [0 /* this.hap.H264Level.LEVEL3_1 */, 2 /* this.hap.H264Level.LEVEL4_0 */],
                    },
                },
            },
        };
    }
}
exports.SpaceCamStreamingDelegate = SpaceCamStreamingDelegate;
