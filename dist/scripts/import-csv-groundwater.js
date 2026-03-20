"use strict";
// src/scripts/import-csv-groundwater.ts
// Run: npx ts-node src/scripts/import-csv-groundwater.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const db_1 = require("../config/db");
const Groundwater_1 = require("../models/Groundwater"); // ← Import IGroundwater
const logger_1 = __importDefault(require("../utils/logger"));
async function importCSV() {
    try {
        await (0, db_1.connectDB)();
        logger_1.default.info('Starting CSV groundwater import...');
        const csvFilePath = path_1.default.join(__dirname, '../data/groundwater_levels.csv');
        if (!fs_1.default.existsSync(csvFilePath)) {
            throw new Error(`CSV file not found: ${csvFilePath}\nSave your file in src/data/groundwater_levels.csv`);
        }
        // Explicitly typed array (fixes implicit 'any[]')
        const records = [];
        logger_1.default.info('Reading CSV file...');
        await new Promise((resolve, reject) => {
            let rowCount = 0;
            fs_1.default.createReadStream(csvFilePath)
                .pipe((0, csv_parser_1.default)()) // No invalid { trim: true } option
                .on('headers', (headers) => {
                logger_1.default.info('Detected CSV headers:', headers);
            })
                .on('data', (row) => {
                rowCount++;
                try {
                    // Use exact column names from your CSV
                    const stationId = (row.station_name || '').trim();
                    const state = (row.state_name || 'Unknown').trim();
                    if (!stationId || !state) {
                        logger_1.default.debug(`Row ${rowCount} skipped - missing station_name or state_name`, row);
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
                            coordinates: hasCoords ? { type: 'Point', coordinates: [lng, lat] } : undefined,
                        },
                        date: measurementDate,
                        waterLevelMbgl,
                        source: row.source || 'CGWB_CSV',
                        trend: undefined,
                    });
                }
                catch (err) {
                    // Safe error handling (fixes 'err' unknown type)
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    logger_1.default.debug(`Row ${rowCount} skipped due to error`, { row, error: errorMsg });
                }
            })
                .on('end', () => {
                logger_1.default.info(`CSV parsing finished — found ${records.length} valid records`);
                resolve();
            })
                .on('error', (err) => {
                const errorMsg = err instanceof Error ? err.message : String(err);
                logger_1.default.error('CSV parsing stream error', { error: errorMsg });
                reject(err);
            });
        });
        if (records.length === 0) {
            logger_1.default.warn('No valid records parsed — check CSV headers and data');
            logger_1.default.info('Expected headers include: station_name, state_name, currentlevel, date, latitude, longitude');
            await mongoose_1.default.connection.close();
            return;
        }
        logger_1.default.info(`Saving ${records.length} records to DB...`);
        const batchSize = 500;
        let savedCount = 0;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            try {
                const result = await Groundwater_1.Groundwater.insertMany(batch, { ordered: false });
                savedCount += result.length;
                logger_1.default.info(`Batch ${Math.floor(i / batchSize) + 1} saved: ${result.length} records`);
            }
            catch (batchErr) {
                const errorMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
                logger_1.default.error(`Batch ${Math.floor(i / batchSize) + 1} failed`, { error: errorMsg });
            }
        }
        logger_1.default.info(`CSV import SUCCESS: ${savedCount} records saved`);
        await mongoose_1.default.connection.close();
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger_1.default.error('CSV import failed', { error: errorMsg });
        await mongoose_1.default.connection.close().catch(() => { });
    }
}
importCSV().catch((err) => {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Script crashed:', errorMsg);
    process.exit(1);
});
//# sourceMappingURL=import-csv-groundwater.js.map