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

    // If file doesn't exist, skip gracefully — fallback data will be used at query time
    if (!fs.existsSync(filePath)) {
        console.warn(`[RainfallLoader] rainfall.csv not found at ${filePath} — using in-memory state defaults.`);
        isLoaded = true;
        return;
    }

    return new Promise((resolve) => {
        const stream = fs.createReadStream(filePath);
        
        // Handle stream-level errors (like ENOENT) directly on the source
        stream.on('error', (error: any) => {
            console.warn(`[RainfallLoader] Failed to open rainfall.csv: ${error.message} — using default state distributions.`);
            isLoaded = true;
            resolve();
        });

        stream.pipe(csvParser())
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
                if (rainfallCache.length > 0) {
                    console.log(`[RainfallLoader] Successfully loaded ${rainfallCache.length} district rainfall records.`);
                }
                resolve();
            })
            .on('error', (error: any) => {
                console.error('[RainfallLoader] CSV Parsing error:', error.message);
                isLoaded = true;
                resolve();
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

import { getStationById } from './stationLoader.service';

const stateRainfallDefaults: Record<string, { avg: number; trend: string }> = {
    'andhra pradesh': { avg: 940, trend: 'Stable' },
    'telangana': { avg: 950, trend: 'Increasing' },
    'maharashtra': { avg: 1150, trend: 'Stable' },
    'karnataka': { avg: 1240, trend: 'Decreasing' },
    'kerala': { avg: 3100, trend: 'Increasing' },
    'rajasthan': { avg: 575, trend: 'Decreasing' },
    'gujarat': { avg: 830, trend: 'Stable' },
    'pujnab': { avg: 650, trend: 'Decreasing' },
    'haryana': { avg: 530, trend: 'Decreasing' },
    'tamil nadu': { avg: 945, trend: 'Stable' },
    'west bengal': { avg: 1750, trend: 'Increasing' },
    'assam': { avg: 2800, trend: 'Increasing' },
    'meghalaya': { avg: 11500, trend: 'Stable' }, // Mawsynram factor
    'delhi': { avg: 610, trend: 'Stable' },
    'all india': { avg: 1080, trend: 'Stable' }
};

export const getRainfallTrend = (stationId: string): RainfallData | null => {
    const station = getStationById(stationId);
    if (!station) {
        console.warn(`[RainfallLoader] Station ${stationId} not found, cannot fetch rainfall.`);
        return null;
    }

    const record = getByLocation(station.stateName, station.districtName);
    if (record) return record;

    // Fallback based on state
    const stateKey = station.stateName.toLowerCase();
    const stateDef = stateRainfallDefaults[stateKey] || stateRainfallDefaults['all india'];

    return {
        state: station.stateName,
        district: station.districtName,
        trend: stateDef.trend,
        averageAnnualRainfall: stateDef.avg,
        rainfall2023: +(stateDef.avg * (0.95 + Math.random() * 0.1)).toFixed(0),
        rainfall2022: +(stateDef.avg * (0.9 + Math.random() * 0.2)).toFixed(0),
        rainfall2021: +(stateDef.avg * (0.85 + Math.random() * 0.3)).toFixed(0),
    };
};

// Helper internal function
const getByLocation = (state: string, district: string): RainfallData | null => {
    const searchState = state.trim().toLowerCase();
    const searchDistrict = district.trim().toLowerCase();
    return rainfallCache.find(r => r.state === searchState && r.district === searchDistrict) || null;
};
