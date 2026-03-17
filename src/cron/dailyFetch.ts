// src/cron/dailyFetch.ts
import cron from 'node-cron';
import logger from '../utils/logger';
import { fetchAndSaveGroundwaterData } from '../services/fetchGroundwater';

// States list (daily fetch cheyali – mana focus states + extra)
const STATES_TO_FETCH = [
  'Andhra Pradesh',
  'Tamil Nadu',
  'Karnataka',
  'Telangana',
  'Maharashtra',
  // Inka add cheyochu: 'Gujarat', 'Rajasthan', 'Punjab', 'Uttar Pradesh' etc.
];

export function setupDailyFetchCron() {
  // Every day at 3:00 AM (server time IST anukunte)
  // Format: minute(0) hour(3) day-of-month(*) month(*) day-of-week(*)
  cron.schedule('0 3 * * *', async () => {
    logger.info('🚀 Daily groundwater fetch cron started at 3:00 AM');

    for (const state of STATES_TO_FETCH) {
      try {
        logger.info(`Fetching groundwater data for: ${state}`);
        // pass an empty district so that the service can decide how to handle it
        await fetchAndSaveGroundwaterData(state, '');
        logger.info(`✅ Successfully fetched & saved data for ${state}`);
      } catch (error: any) {
        logger.error(`❌ Fetch failed for ${state}`, {
          message: error.message,
          stack: error.stack,
        });
      }
    }

    logger.info('🎉 Daily fetch cron job completed successfully');
  }, {
    timezone: 'Asia/Kolkata'  // Important: IST timezone fix
  });

  logger.info(`Daily cron job scheduled: 3:00 AM IST for ${STATES_TO_FETCH.length} states`);
}