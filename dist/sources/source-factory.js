"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSourceAdapter = createSourceAdapter;
const msl_raw_source_1 = require("./msl-raw-source");
function createSourceAdapter(cameraConfig) {
    return new msl_raw_source_1.MslRawSource(cameraConfig.sourceType);
}
