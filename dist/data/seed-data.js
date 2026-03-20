"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const Groundwater_1 = require("../models/Groundwater");
const logger_1 = __importDefault(require("../utils/logger"));
// FIXED: JSON import (after tsconfig fix)
const initial_groundwater_data_json_1 = __importDefault(require("./initial-groundwater-data.json"));
async function seedDatabase() {
    try {
        await (0, db_1.connectDB)();
        logger_1.default.info('Connected to MongoDB – starting seed...');
        // Optional: Clear old manual data
        // await Groundwater.deleteMany({ source: 'Manual' });
        // Format data to match model
        // Format data to match model
        // ensure we treat the JSON either as an object with Table or an array
        const dataList = Array.isArray(initial_groundwater_data_json_1.default.Table)
            ? initial_groundwater_data_json_1.default.Table
            : initial_groundwater_data_json_1.default;
        if (!Array.isArray(dataList)) {
            logger_1.default.error('Invalid data format: Expected array or object with Table property');
            process.exit(1);
        }
        const formattedData = dataList.map((item) => ({
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
        const result = await Groundwater_1.Groundwater.insertMany(formattedData, { ordered: false });
        logger_1.default.info(`Successfully seeded ${result.length} records from initial dataset`);
        process.exit(0);
    }
    catch (err) {
        logger_1.default.error('Seed failed', { error: err.message });
        process.exit(1);
    }
}
seedDatabase();
//# sourceMappingURL=seed-data.js.map