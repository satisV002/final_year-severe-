"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * GENERIC PROXY ENDPOINT
 * GET /api/v1/proxy?url=...
 *
 * Allows frontend to fetch external resources via backend to avoid CORS
 * and provide a centralized point for rate-limiting/logging.
 */
router.all('/proxy', async (req, res) => {
    const targetUrl = req.query.url || req.body.url;
    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'Target URL is required' });
    }
    try {
        logger_1.default.info(`Proxying ${req.method} request to: ${targetUrl}`);
        const response = await (0, axios_1.default)({
            method: req.method,
            url: targetUrl,
            data: req.method !== 'GET' ? req.body : undefined,
            params: req.method === 'GET' ? { ...req.query, url: undefined } : undefined,
            timeout: 10000,
            headers: {
                'User-Agent': 'AquaWatch-Backend-Proxy/1.0',
            },
        });
        res.status(response.status).json(response.data);
    }
    catch (error) {
        logger_1.default.error('Proxy request failed', {
            url: targetUrl,
            status: error.response?.status,
            message: error.message
        });
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Proxy request failed',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=proxy.js.map