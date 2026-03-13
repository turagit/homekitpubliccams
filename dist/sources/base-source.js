"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSourceAdapter = void 0;
const http_client_1 = require("../net/http-client");
class BaseSourceAdapter {
    http;
    apiKey;
    constructor(apiKey) {
        this.http = new http_client_1.HttpClient();
        this.apiKey = apiKey || 'DEMO_KEY';
    }
    validateConfig(_config) {
        return { valid: true, issues: [] };
    }
    nasaApiUrl(endpoint, params = {}) {
        const url = new URL(endpoint, 'https://api.nasa.gov');
        url.searchParams.set('api_key', this.apiKey);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        return url.toString();
    }
}
exports.BaseSourceAdapter = BaseSourceAdapter;
