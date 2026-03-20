"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDailyFetchCron = setupDailyFetchCron;
// src/cron/dailyFetch.ts
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = __importDefault(require("../utils/logger"));
const fetchGroundwater_1 = require("../services/fetchGroundwater");
// States list (daily fetch cheyali – mana focus states + extra)
const STATES_TO_FETCH = [
    'Andhra Pradesh',
    'Tamil Nadu',
    'Karnataka',
    'Telangana',
    'Maharashtra',
    'Uttar Pradesh',
    // Inka add cheyochu: 'Gujarat', 'Rajasthan', 'Punjab' etc.
];
function setupDailyFetchCron() {
    // Every day at 3:00 AM (server time IST anukunte)
    // Format: minute(0) hour(3) day-of-month(*) month(*) day-of-week(*)
    node_cron_1.default.schedule('0 3 * * *', async () => {
        logger_1.default.info('🚀 Daily groundwater fetch cron started at 3:00 AM');
        for (const state of STATES_TO_FETCH) {
            try {
                logger_1.default.info(`Fetching groundwater data for: ${state}`);
                // pass an empty district so that the service can decide how to handle it
                await (0, fetchGroundwater_1.fetchAndSaveGroundwaterData)(state, '');
                logger_1.default.info(`✅ Successfully fetched & saved data for ${state}`);
            }
            catch (error) {
                logger_1.default.error(`❌ Fetch failed for ${state}`, {
                    message: error.message,
                    stack: error.stack,
                });
            }
        }
        logger_1.default.info('🎉 Daily fetch cron job completed successfully');
    }, {
        timezone: 'Asia/Kolkata' // Important: IST timezone fix
    });
    logger_1.default.info(`Daily cron job scheduled: 3:00 AM IST for ${STATES_TO_FETCH.length} states`);
}
//# sourceMappingURL=dailyFetch.js.map