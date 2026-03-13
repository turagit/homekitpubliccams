"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticsStore = void 0;
class DiagnosticsStore {
    state = new Map();
    set(diag) {
        this.state.set(diag.sourceId, diag);
    }
    get(sourceId) {
        return this.state.get(sourceId);
    }
}
exports.DiagnosticsStore = DiagnosticsStore;
