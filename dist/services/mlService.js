"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDataToML = sendDataToML;
// src/services/mlService.ts
const logger_1 = __importDefault(require("../utils/logger"));
const env_1 = require("../config/env");
async function sendDataToML(data // ← changed to plain interface
) {
    if (env_1.env.isTest) {
        return {
            predictions: [],
            summary: {
                trend: 'N/A',
                riskLevel: 'N/A',
            },
        };
    }
    logger_1.default.info(`Sending ${data.length} records to ML model`);
    const mlInput = data.map(item => ({
        date: item.date instanceof Date ? item.date.toISOString() : item.date,
        waterLevelMbgl: item.waterLevelMbgl,
        location: item.location.village ||
            item.location.district ||
            item.location.state ||
            'Unknown',
    }));
    try {
        // Your mock logic (replace with real ML call later)
        const predictions = mlInput.map(item => ({
            date: item.date,
            predictedMbgl: Number((item.waterLevelMbgl * 0.95).toFixed(2)),
            confidence: 75,
        }));
        return {
            predictions,
            summary: {
                trend: data.length > 1 ? 'Stable' : 'N/A',
                riskLevel: 'Semi-Critical',
            },
        };
    }
    catch (err) {
        logger_1.default.error('ML processing failed', { error: err.message });
        throw new Error('ML prediction failed');
    }
}
//# sourceMappingURL=mlService.js.map