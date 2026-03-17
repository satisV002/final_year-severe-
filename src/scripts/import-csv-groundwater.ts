// src/scripts/import-csv-groundwater.ts
// Run: npx ts-node src/scripts/import-csv-groundwater.ts

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { connectDB } from '../config/db';
import { Groundwater, IGroundwater } from '../models/Groundwater';  // ← Import IGroundwater
import logger from '../utils/logger';

// Interface matching your CSV columns
interface CsvRow {
  id?: string;
  date?: string;
  state_name?: string;
  state_code?: string;
  district_name?: string;
  district_code?: string;
  station_name?: string;
  latitude?: string;
  longitude?: string;
  basin?: string;
  sub_basin?: string;
  source?: string;
  currentlevel?: string;
  level_diff?: string;
}

async function importCSV() {
  try {
    await connectDB();
    logger.info('Starting CSV groundwater import...');

    const csvFilePath = path.join(__dirname, '../data/groundwater_levels.csv');

    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}\nSave your file in src/data/groundwater_levels.csv`);
    }

    // Explicitly typed array (fixes implicit 'any[]')
    const records: Partial<IGroundwater>[] = [];

    logger.info('Reading CSV file...');

    await new Promise<void>((resolve, reject) => {
      let rowCount = 0;

      fs.createReadStream(csvFilePath)
        .pipe(csvParser())  // No invalid { trim: true } option
        .on('headers', (headers: string[]) => {
          logger.info('Detected CSV headers:', headers);
        })
        .on('data', (row: CsvRow) => {
          rowCount++;
          try {
            // Use exact column names from your CSV
            const stationId = (row.station_name || '').trim();
            const state = (row.state_name || 'Unknown').trim();

            if (!stationId || !state) {
              logger.debug(`Row ${rowCount} skipped - missing station_name or state_name`, row);
              return;
            }

            const lat = parseFloat(row.latitude || '0');
            const lng = parseFloat(row.longitude || '0');
            const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

            // Water level from your column "currentlevel"
            const mbglStr = row.currentlevel || '';
            const waterLevelMbgl = mbglStr.trim() ? parseFloat(mbglStr) : undefined;

            // Parse date (DD-MM-YYYY format)
            let measurementDate = new Date();
            const dateStr = row.date || '';
            if (dateStr.trim()) {
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                const [day, month, year] = parts;
                measurementDate = new Date(`${year}-${month}-${day}`);
              }
              if (isNaN(measurementDate.getTime())) {
                measurementDate = new Date();
              }
            }

            records.push({
              location: {
                state,
                district: (row.district_name || '').trim() || undefined,
                block: undefined, // no tahsil/block in your sample
                village: undefined,
                pinCode: undefined,
                stationId,
                coordinates: hasCoords ? { type: 'Point' as const, coordinates: [lng, lat] } : undefined,
              },
              date: measurementDate,
              waterLevelMbgl,
              source: row.source || 'CGWB_CSV',
              trend: undefined,
            });
          } catch (err: unknown) {
            // Safe error handling (fixes 'err' unknown type)
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.debug(`Row ${rowCount} skipped due to error`, { row, error: errorMsg });
          }
        })
        .on('end', () => {
          logger.info(`CSV parsing finished — found ${records.length} valid records`);
          resolve();
        })
        .on('error', (err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error('CSV parsing stream error', { error: errorMsg });
          reject(err);
        });
    });

    if (records.length === 0) {
      logger.warn('No valid records parsed — check CSV headers and data');
      logger.info('Expected headers include: station_name, state_name, currentlevel, date, latitude, longitude');
      await mongoose.connection.close();
      return;
    }

    logger.info(`Saving ${records.length} records to DB...`);

    const batchSize = 500;
    let savedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      try {
        const result = await Groundwater.insertMany(batch, { ordered: false });
        savedCount += result.length;
        logger.info(`Batch ${Math.floor(i / batchSize) + 1} saved: ${result.length} records`);
      } catch (batchErr: unknown) {
        const errorMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
        logger.error(`Batch ${Math.floor(i / batchSize) + 1} failed`, { error: errorMsg });
      }
    }

    logger.info(`CSV import SUCCESS: ${savedCount} records saved`);
    await mongoose.connection.close();

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('CSV import failed', { error: errorMsg });
    await mongoose.connection.close().catch(() => {});
  }
}

importCSV().catch((err: unknown) => {
  const errorMsg = err instanceof Error ? err.message : String(err);
  console.error('Script crashed:', errorMsg);
  process.exit(1);
});