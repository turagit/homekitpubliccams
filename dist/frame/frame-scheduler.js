"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrameScheduler = void 0;
class FrameScheduler {
    options;
    cursor = 0;
    constructor(options) {
        this.options = options;
    }
    nextIndex(length) {
        if (length <= 0) {
            return -1;
        }
        if (this.options.mode === 'shuffle') {
            return Math.floor(Math.random() * length);
        }
        if (this.options.mode === 'newest-first') {
            return 0;
        }
        const index = this.cursor % length;
        this.cursor += 1;
        return index;
    }
    getFrameIntervalMs() {
        return Math.max(1, this.options.frameIntervalSec) * 1000;
    }
    reset() {
        this.cursor = 0;
    }
}
exports.FrameScheduler = FrameScheduler;
