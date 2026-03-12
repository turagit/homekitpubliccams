import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

export type EncoderBackend = 'internal' | 'ffmpeg';

export interface StreamConstraints {
  codec: 'h264';
  profile: 'baseline' | 'main' | 'high';
  level: '3.1' | '4.0';
  packetizationMode: 1;
}

export interface StartStreamOptions {
  sessionId: string;
  backend: EncoderBackend;
  target: {
    host: string;
    port: number;
    ssrc: number;
    payloadType: number;
  };
  constraints: StreamConstraints;
}

/**
 * Handles RTP/H.264 packaging and transport for HomeKit camera sessions.
 *
 * Two encoder backends are supported:
 * 1) preferred internal encoder path,
 * 2) compatibility path via ffmpeg subprocess.
 */
export class StreamController {
  private readonly ffmpegBin: string;
  private readonly ffmpegArgs: string[];
  private readonly supportsInternalEncoder: boolean;

  constructor(config: {
    ffmpegBin?: string;
    ffmpegArgs?: string[];
    supportsInternalEncoder?: boolean;
  }) {
    this.ffmpegBin = config.ffmpegBin ?? 'ffmpeg';
    this.ffmpegArgs = config.ffmpegArgs ?? [];
    this.supportsInternalEncoder = config.supportsInternalEncoder ?? false;
  }

  public canUseInternalEncoder(): boolean {
    return this.supportsInternalEncoder;
  }

  public startStream(options: StartStreamOptions): StreamHandle {
    this.validateConstraints(options.constraints);

    if (options.backend === 'internal') {
      if (!this.canUseInternalEncoder()) {
        throw new Error('Internal encoder backend selected but unavailable.');
      }
      return this.startInternalEncoderStream(options);
    }

    return this.startFfmpegStream(options);
  }

  private validateConstraints(constraints: StreamConstraints): void {
    if (constraints.codec !== 'h264') {
      throw new Error(`Unsupported codec: ${constraints.codec}. Expected h264.`);
    }
    if (constraints.packetizationMode !== 1) {
      throw new Error('Only H.264 packetization-mode=1 is supported.');
    }
  }

  private startInternalEncoderStream(options: StartStreamOptions): StreamHandle {
    // Placeholder for internal pipeline that encodes and packetizes directly.
    // This path is preferred to avoid subprocess overhead.
    return {
      backend: 'internal',
      stop: async () => {
        // no-op placeholder
      },
      metadata: {
        sessionId: options.sessionId,
        target: `${options.target.host}:${options.target.port}`,
      },
    };
  }

  private startFfmpegStream(options: StartStreamOptions): StreamHandle {
    const args = [
      ...this.ffmpegArgs,
      '-f', 'rawvideo',
      '-pix_fmt', 'yuv420p',
      '-i', '-',
      '-an',
      '-c:v', 'libx264',
      '-profile:v', options.constraints.profile,
      '-level:v', options.constraints.level,
      '-f', 'rtp',
      `rtp://${options.target.host}:${options.target.port}?payload_type=${options.target.payloadType}&ssrc=${options.target.ssrc}`,
    ];

    const proc = spawn(this.ffmpegBin, args, { stdio: ['pipe', 'ignore', 'pipe'] });

    return {
      backend: 'ffmpeg',
      stop: async () => this.stopProcess(proc),
      metadata: {
        sessionId: options.sessionId,
        pid: proc.pid,
      },
    };
  }

  private async stopProcess(proc: ChildProcessWithoutNullStreams): Promise<void> {
    if (proc.killed) return;

    await new Promise<void>((resolve) => {
      proc.once('exit', () => resolve());
      proc.kill('SIGTERM');
    });
  }
}

export interface StreamHandle {
  backend: EncoderBackend;
  stop(): Promise<void>;
  metadata: Record<string, string | number | undefined>;
}
