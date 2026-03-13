"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourcePath = void 0;
const path_1 = __importDefault(require("path"));
const sourcePath = (base, sourceId) => path_1.default.join(base, 'sources', sourceId);
exports.sourcePath = sourcePath;
