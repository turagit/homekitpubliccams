export interface SourceDiagnostics {
  sourceId: string;
  lastRefreshAt?: string;
  lastSuccessAt?: string;
  cachedItems: number;
  lastError?: string;
}

export class DiagnosticsStore {
  private readonly state = new Map<string, SourceDiagnostics>();

  public set(diag: SourceDiagnostics): void {
    this.state.set(diag.sourceId, diag);
  }

  public get(sourceId: string): SourceDiagnostics | undefined {
    return this.state.get(sourceId);
  }
}
