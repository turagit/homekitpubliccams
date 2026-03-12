export interface StreamSession {
  sessionId: string;
  startedAt: string;
}

export class StreamController {
  public start(sessionId: string): StreamSession {
    return { sessionId, startedAt: new Date().toISOString() };
  }

  public stop(_sessionId: string): void {
    // Foundation stub.
  }
}
