import { StreamController, StreamSession } from './stream-controller';

export class SessionManager {
  private readonly sessions = new Map<string, StreamSession>();

  constructor(private readonly streamController: StreamController) {}

  public open(sessionId: string): StreamSession {
    const session = this.streamController.start(sessionId);
    this.sessions.set(sessionId, session);
    return session;
  }

  public close(sessionId: string): void {
    this.streamController.stop(sessionId);
    this.sessions.delete(sessionId);
  }
}
