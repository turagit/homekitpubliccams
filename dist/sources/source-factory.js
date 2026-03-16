"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSourceAdapter = createSourceAdapter;
const m20_raw_source_1 = require("./m20-raw-source");
const msl_raw_source_1 = require("./msl-raw-source");
function createSourceAdapter(cameraConfig) {
    const { sourceType } = cameraConfig;
    if (sourceType.startsWith('m20-')) {
        return new m20_raw_source_1.M20RawSource(sourceType);
    }
    return new msl_raw_source_1.MslRawSource(sourceType);
}
