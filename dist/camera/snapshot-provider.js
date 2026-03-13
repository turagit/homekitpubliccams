"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotProvider = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
/**
 * Provides snapshot images from the current frame on disk.
 * Used by the streaming delegate for HomeKit snapshot requests,
 * and can be used independently for diagnostics.
 */
class SnapshotProvider {
    currentFramePath;
    setCurrentFrame(path) {
        this.currentFramePath = path;
    }
    getCurrentFramePath() {
        return this.currentFramePath;
    }
    async getCurrentSnapshot() {
        if (!this.currentFramePath) {
            return undefined;
        }
        try {
            return await node_fs_1.default.promises.readFile(this.currentFramePath);
        }
        catch {
            return undefined;
        }
    }
}
exports.SnapshotProvider = SnapshotProvider;
