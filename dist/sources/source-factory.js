"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSourceAdapter = createSourceAdapter;
const apod_source_1 = require("./apod-source");
const hubble_source_1 = require("./hubble-source");
const jwst_source_1 = require("./jwst-source");
const mars_source_1 = require("./mars-source");
const nasa_image_library_source_1 = require("./nasa-image-library-source");
function createSourceAdapter(cameraConfig, apiKey) {
    switch (cameraConfig.sourceType) {
        case 'apod':
            return new apod_source_1.ApodSource(apiKey);
        case 'hubble':
            return new hubble_source_1.HubbleSource(apiKey);
        case 'jwst':
            return new jwst_source_1.JwstSource(apiKey);
        case 'curiosity':
        case 'perseverance':
            return new mars_source_1.MarsSource(cameraConfig.sourceType, apiKey);
        case 'nasa-mixed':
        default:
            return new nasa_image_library_source_1.NasaImageLibrarySource(apiKey);
    }
}
