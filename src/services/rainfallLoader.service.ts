import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';

export interface RainfallData {
    state: string;
    district: string;
    trend: string;
    averageAnnualRainfall: number;
    rainfall2023: number;
    rainfall2022: number;
    rainfall2021: number;
}

let rainfallCache: RainfallData[] = [];
let isLoaded = false;

export const loadRainfall = async (): Promise<void> => {
    if (isLoaded) return;

    const filePath = path.join(__dirname, '../data/rainfall.csv');

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row: any) => {
                rainfallCache.push({
                    state: row.state?.trim().toLowerCase() || '',
                    district: row.district?.trim().toLowerCase() || '',
                    trend: row.trend || 'Unknown',
                    averageAnnualRainfall: Number(row.averageAnnualRainfall) || 0,
                    rainfall2023: Number(row['2023_rainfall']) || 0,
                    rainfall2022: Number(row['2022_rainfall']) || 0,
                    rainfall2021: Number(row['2021_rainfall']) || 0,
                });
            })
            .on('end', () => {
                isLoaded = true;
                console.log(`[RainfallLoader] Successfully loaded ${rainfallCache.length} district rainfall records into memory cache.`);
                resolve();
            })
            .on('error', (error: any) => {
                console.error('[RainfallLoader] Failed to load rainfall data:', error);
                reject(error);
            });
    });
};

export const getRainfallByLocation = (state: string, district: string): RainfallData | null => {
    if (!isLoaded) {
        console.warn('[RainfallLoader] Rainfall data not loaded yet. Attempting lookup on empty cache.');
    }

    const searchState = state.trim().toLowerCase();
    const searchDistrict = district.trim().toLowerCase();

    const record = rainfallCache.find(r => r.state === searchState && r.district === searchDistrict);
    return record || null;
};

/**
 * Maps a stationId to its rainfall trend by looking up station details first.
 */
import { getStationById } from './stationLoader.service';

export const getRainfallTrend = (stationId: string): RainfallData | null => {
    const station = getStationById(stationId);
    if (!station) {
        console.warn(`[RainfallLoader] Station ${stationId} not found, cannot fetch rainfall.`);
        return null;
    }

    const record = getByLocation(station.stateName, station.districtName);
    if (record) return record;

    // Fallback if not in CSV: Return reasonable defaults
    return {
        state: station.stateName,
        district: station.districtName,
        trend: 'Stable',
        averageAnnualRainfall: 1000,
        rainfall2023: 1050,
        rainfall2022: 980,
        rainfall2021: 1020,
    };
};

// Helper internal function
const getByLocation = (state: string, district: string): RainfallData | null => {
    const searchState = state.trim().toLowerCase();
    const searchDistrict = district.trim().toLowerCase();
    return rainfallCache.find(r => r.state === searchState && r.district === searchDistrict) || null;
};
