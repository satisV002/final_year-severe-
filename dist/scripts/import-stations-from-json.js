"use strict";
// src/scripts/import-stations-from-json.ts
// Run: npx ts-node src/scripts/import-stations-from-json.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../config/db");
const Groundwater_1 = require("../models/Groundwater");
const logger_1 = __importDefault(require("../utils/logger"));
async function importStationsFromJSON() {
    try {
        await (0, db_1.connectDB)();
        logger_1.default.info('Starting JSON stations import...');
        const filePath = path_1.default.join(__dirname, '../data/stations.json');
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`JSON file not found: ${filePath}`);
        }
        const raw = fs_1.default.readFileSync(filePath, 'utf-8');
        const stations = JSON.parse(raw);
        if (!Array.isArray(stations) || stations.length === 0) {
            throw new Error('JSON is empty or not an array');
        }
        logger_1.default.info(`Loaded ${stations.length} stations from JSON`);
        const bulkOps = [];
        for (const station of stations) {
            const state = station.State_Name?.trim() || '';
            if (!state) {
                logger_1.default.debug('Skipped - missing state', station);
                continue;
            }
            const stationId = station.Station_Name?.trim();
            if (!stationId) {
                logger_1.default.debug('Skipped - missing station name/ID', { state });
                continue;
            }
            const lat = station.Latitude;
            const lng = station.Longitude;
            const hasCoords = typeof lat === 'number' &&
                typeof lng === 'number' &&
                !isNaN(lat) &&
                !isNaN(lng);
            // Explicitly type doc to match IGroundwater (partial is ok)
            const doc = {
                location: {
                    state,
                    district: station.District_Name?.trim() || undefined,
                    block: station.Tahsil_Name?.trim() || undefined,
                    village: undefined,
                    pinCode: undefined,
                    stationId,
                    coordinates: hasCoords
                        ? { type: 'Point', coordinates: [lng, lat] }
                        : undefined,
                },
                date: new Date(), // we always set this
                source: `JSON_${station.Agency_Name?.trim() || 'Unknown'}`,
            };
            // Since we know date is always set here
            const safeDate = doc.date;
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
            logger_1.default.warn('No valid stations to import after filtering');
            return;
        }
        logger_1.default.info(`Executing bulk write with ${bulkOps.length} operations...`);
        const result = await Groundwater_1.Groundwater.bulkWrite(bulkOps, { ordered: false });
        logger_1.default.info(`Bulk write success:\n` +
            `  Inserted: ${result.insertedCount}\n` +
            `  Modified: ${result.modifiedCount}\n` +
            `  Upserted: ${result.upsertedCount}\n` +
            `  Matched:  ${result.matchedCount}`);
    }
    catch (err) {
        logger_1.default.error('Import failed', {
            message: err.message,
            name: err.name,
            code: err.code,
            stack: err.stack,
        });
    }
    finally {
        await mongoose_1.default.connection.close().catch(() => { });
        logger_1.default.info('MongoDB connection closed');
    }
}
importStationsFromJSON().catch((err) => {
    console.error('Script crashed:', err);
    process.exit(1);
});
//# sourceMappingURL=import-stations-from-json.js.map