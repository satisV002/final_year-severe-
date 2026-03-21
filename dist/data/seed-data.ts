// src/scripts/seed-data.ts
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Groundwater } from '../models/Groundwater';
import logger from '../utils/logger';

// FIXED: JSON import (after tsconfig fix)
import initialData from './initial-groundwater-data.json';

async function seedDatabase() {
  try {
    await connectDB();
    logger.info('Connected to MongoDB – starting seed...');

    // Optional: Clear old manual data
    // await Groundwater.deleteMany({ source: 'Manual' });

    // Format data to match model
    // Format data to match model
    // ensure we treat the JSON either as an object with Table or an array
    const dataList = Array.isArray((initialData as any).Table)
      ? (initialData as any).Table
      : (initialData as any);

    if (!Array.isArray(dataList)) {
      logger.error('Invalid data format: Expected array or object with Table property');
      process.exit(1);
    }

    const formattedData = dataList.map((item: any) => ({
      location: {
        state: item.State_Name || item.location?.state,
        district: item.District_Name || item.location?.district,
        block: item.Tahsil_Name || item.location?.block,
        village: item.Station_Name || item.location?.village, // Using Station Name as village/place identifier
        // Coordinates from Latitude/Longitude if available
        coordinates: (item.Longitude && item.Latitude) ? {
          type: 'Point',
          coordinates: [parseFloat(item.Longitude), parseFloat(item.Latitude)]
        } : undefined,
        stationId: item.Station_Name || item.location?.stationId
      },
      // Use current date if no date provided, or parse provided date
      date: new Date(),
      // Mock water level if not present, or parse it
      waterLevelMbgl: item.Water_Level ? parseFloat(item.Water_Level) : (Math.random() * 20 + 5), // Random 5-25m if missing
      trend: 'Stable',
      source: 'Manual Import',
    }));

    // Bulk insert (safe – no duplicates if unique index exists)
    const result = await Groundwater.insertMany(formattedData, { ordered: false });

    logger.info(`Successfully seeded ${result.length} records from initial dataset`);
    process.exit(0);
  } catch (err: any) {
    logger.error('Seed failed', { error: err.message });
    process.exit(1);
  }
}

seedDatabase();