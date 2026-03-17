// src/scripts/import-stations-from-json.ts
// Run: npx ts-node src/scripts/import-stations-from-json.ts

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { connectDB } from '../config/db';
import { Groundwater, IGroundwater } from '../models/Groundwater';
import logger from '../utils/logger';

interface StationJSON {
  Agency_Name?: string;
  State_Name?: string;
  District_Name?: string;
  Tahsil_Name?: string;
  Station_Name?: string;
  Latitude?: number;
  Longitude?: number;
  Station_Type?: string;
  Station_Status?: string;
}

async function importStationsFromJSON() {
  try {
    await connectDB();
    logger.info('Starting JSON stations import...');

    const filePath = path.join(__dirname, '../data/stations.json');

    if (!fs.existsSync(filePath)) {
      throw new Error(`JSON file not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const stations: StationJSON[] = JSON.parse(raw);

    if (!Array.isArray(stations) || stations.length === 0) {
      throw new Error('JSON is empty or not an array');
    }

    logger.info(`Loaded ${stations.length} stations from JSON`);

    const bulkOps: mongoose.AnyBulkWriteOperation<IGroundwater>[] = [];

    for (const station of stations) {
      const state = station.State_Name?.trim() || '';
      if (!state) {
        logger.debug('Skipped - missing state', station);
        continue;
      }

      const stationId = station.Station_Name?.trim();
      if (!stationId) {
        logger.debug('Skipped - missing station name/ID', { state });
        continue;
      }

      const lat = station.Latitude;
      const lng = station.Longitude;
      const hasCoords =
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng);

      // Explicitly type doc to match IGroundwater (partial is ok)
      const doc: Partial<IGroundwater> = {
        location: {
          state,
          district: station.District_Name?.trim() || undefined,
          block: station.Tahsil_Name?.trim() || undefined,
          village: undefined,
          pinCode: undefined,
          stationId,
          coordinates: hasCoords
            ? { type: 'Point' as const, coordinates: [lng, lat] }
            : undefined,
        },
        date: new Date(),  // we always set this
        source: `JSON_${station.Agency_Name?.trim() || 'Unknown'}`,
      };

      // Since we know date is always set here
      const safeDate = doc.date!;

      bulkOps.push({
        updateOne: {
          filter: {
            'location.stationId': stationId,
            date: safeDate,
          },
          update: { $set: doc },
          upsert: true,
        },
      });
    }

    if (bulkOps.length === 0) {
      logger.warn('No valid stations to import after filtering');
      return;
    }

    logger.info(`Executing bulk write with ${bulkOps.length} operations...`);

    const result = await Groundwater.bulkWrite(bulkOps, { ordered: false });

    logger.info(
      `Bulk write success:\n` +
        `  Inserted: ${result.insertedCount}\n` +
        `  Modified: ${result.modifiedCount}\n` +
        `  Upserted: ${result.upsertedCount}\n` +
        `  Matched:  ${result.matchedCount}`
    );

  } catch (err: any) {
    logger.error('Import failed', {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack,
    });
  } finally {
    await mongoose.connection.close().catch(() => {});
    logger.info('MongoDB connection closed');
  }
}

importStationsFromJSON().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});