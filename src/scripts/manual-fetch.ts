import { fetchAndSaveGroundwaterData } from '../services/fetchGroundwater';
import { connectDB } from '../config/db';
import logger from '../utils/logger';

async function manualFetch() {
  const state = process.argv[2];
  if (!state) {
    console.error('Usage: npx ts-node src/scripts/manual-fetch.ts "State Name"');
    process.exit(1);
  }

  try {
    await connectDB();
    logger.info(`🚀 Starting manual fetch for state: ${state}`);
    await fetchAndSaveGroundwaterData(state, '');
    logger.info(`✅ Manual fetch completed for ${state}`);
    process.exit(0);
  } catch (error: any) {
    logger.error(`❌ Manual fetch failed for ${state}`, { error: error.message });
    process.exit(1);
  }
}

manualFetch();
