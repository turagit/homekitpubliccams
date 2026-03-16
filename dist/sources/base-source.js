"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSourceAdapter = void 0;
const http_client_1 = require("../net/http-client");
class BaseSourceAdapter {
    http;
    constructor() {
        this.http = new http_client_1.HttpClient();
    }
    validateConfig(_config) {
        return { valid: true, issues: [] };
    }
}
exports.BaseSourceAdapter = BaseSourceAdapter;
