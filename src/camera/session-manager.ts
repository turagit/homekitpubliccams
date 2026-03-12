import { StreamController, EncoderBackend, StreamConstraints, StreamHandle } from './stream-controller';

export interface SessionRequest {
  sessionId: string;
  target: {
    host: string;
    port: number;
    ssrc: number;
    payloadType: number;
  };
  constraints: StreamConstraints;
}

export class SessionManager {
  private readonly streamController: StreamController;
  private preferredBackend: EncoderBackend;

  constructor(streamController: StreamController) {
    this.streamController = streamController;
    this.preferredBackend = this.probeEncoderBackend();
  }

  /**
   * Startup capability probe for backend selection.
   *
   * Sessions use internal encoder when available; otherwise they default to ffmpeg.
   */
  private probeEncoderBackend(): EncoderBackend {
    return this.streamController.canUseInternalEncoder() ? 'internal' : 'ffmpeg';
  }

  public getSelectedBackend(): EncoderBackend {
    return this.preferredBackend;
  }

  public startSession(request: SessionRequest): StreamHandle {
    const backend = this.preferredBackend;

    try {
      return this.streamController.startStream({
        ...request,
        backend,
      });
    } catch (error) {
      if (backend === 'internal') {
        // Runtime fallback: if internal backend fails per session, retry with ffmpeg.
        return this.streamController.startStream({
          ...request,
          backend: 'ffmpeg',
        });
      }
      throw error;
    }
  }
}
