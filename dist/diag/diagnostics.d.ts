export interface SourceDiagnostics {
    sourceId: string;
    lastRefreshAt?: string;
    lastSuccessAt?: string;
    cachedItems: number;
    lastError?: string;
}
export declare class DiagnosticsStore {
    private readonly state;
    set(diag: SourceDiagnostics): void;
    get(sourceId: string): SourceDiagnostics | undefined;
}
