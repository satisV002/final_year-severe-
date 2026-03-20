"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fetchGroundwater_1 = require("../services/fetchGroundwater");
const db_1 = require("../config/db");
const logger_1 = __importDefault(require("../utils/logger"));
async function manualFetch() {
    const state = process.argv[2];
    if (!state) {
        console.error('Usage: npx ts-node src/scripts/manual-fetch.ts "State Name"');
        process.exit(1);
    }
    try {
        await (0, db_1.connectDB)();
        logger_1.default.info(`🚀 Starting manual fetch for state: ${state}`);
        await (0, fetchGroundwater_1.fetchAndSaveGroundwaterData)(state, '');
        logger_1.default.info(`✅ Manual fetch completed for ${state}`);
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error(`❌ Manual fetch failed for ${state}`, { error: error.message });
        process.exit(1);
    }
}
manualFetch();
//# sourceMappingURL=manual-fetch.js.map