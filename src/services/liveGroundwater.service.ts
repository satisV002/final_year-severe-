import axios from 'axios';
import logger from '../utils/logger';
import { getStationById, Station } from './stationLoader.service';
import { Groundwater } from '../models/Groundwater';

const WRIS_API_URL = 'https://indiawris.gov.in/wris/api/groundwater';

export interface WRISApiResponse {
    success: boolean;
    data?: any[];
    message?: string;
    warning?: string;
    isFallback?: boolean;
}

export const fetchLiveGroundwater = async (stationId: string): Promise<WRISApiResponse> => {
    const station = getStationById(stationId);
    if (!station) {
        return { success: false, message: 'Invalid stationId' };
    }

    try {
        // Determine dynamic range (last 1 year for current trend analysis)
        const today = new Date();
        const lastYear = new Date();
        lastYear.setFullYear(today.getFullYear() - 1);

        // Formatting expected by WRIS: dd-MMM-YYYY (e.g., 01-Jan-2023)
        const formatDate = (d: Date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = String(d.getDate()).padStart(2, '0');
            const month = months[d.getMonth()];
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };

        const payload = {
            state: station.stateName,
            district: station.districtName,
            agencyName: 'CGWB',
            stationCode: station.stationName, // In some cases, WRIS uses station Name as code or filters by it.
            startdate: formatDate(lastYear),
            enddate: formatDate(today)
        };

        logger.info(`Fetching live groundwater data for station: ${stationId}`, payload);

        // Timeout is crucial to prevent hanging the server
        const response = await axios.post(WRIS_API_URL, payload, { timeout: 10000 });

        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            return { success: true, data: [], warning: 'No groundwater data available' };
        }

        // Filter to specific station in case WRIS returned district-level data
        let stationData = response.data;
        if (stationData[0] && stationData[0].stationName) {
            // Perform case-insensitive match on the station name if available
            stationData = stationData.filter(
                (d: any) => d.stationName && d.stationName.toLowerCase() === station.stationName.toLowerCase()
            );
        }

        if (stationData.length === 0) {
            return { success: true, data: [], warning: 'No groundwater data available for this specific station' };
        }

        // Cleaned up data
        const cleanedRecords = stationData.map((record: any) => ({
            date: record.observationDate || record.Measurement_Date,
            level: parseFloat(record.depthToWaterLevel || record.Groundwater_Level),
            agency: record.agencyName || 'CGWB'
        })).filter((r: any) => !isNaN(r.level));

        return { success: true, data: cleanedRecords };

    } catch (error: any) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            logger.warn(`WRIS server timeout for station ${stationId}. Returning fallback data.`);
            return getFallbackData(station);
        }

        if (error.response && error.response.status === 400) {
            logger.warn(`Invalid dates or bad request to WRIS API for station ${stationId}. Returning fallback data.`);
            return getFallbackData(station);
        }

        logger.error('Unexpected WRIS API error, returning fallback', { error: error.message, stationId });
        return getFallbackData(station);
    }
};

const stateGroundwaterProfiles: Record<string, { base: number; swing: number; trend: 'Rising' | 'Falling' | 'Stable' }> = {
    'rajasthan': { base: 25, swing: 5, trend: 'Falling' },
    'punjab': { base: 22, swing: 4, trend: 'Falling' },
    'haryana': { base: 20, swing: 4, trend: 'Falling' },
    'delhi': { base: 18, swing: 3, trend: 'Falling' },
    'tamil nadu': { base: 12, swing: 6, trend: 'Stable' },
    'karnataka': { base: 15, swing: 5, trend: 'Falling' },
    'andhra pradesh': { base: 10, swing: 4, trend: 'Stable' },
    'telangana': { base: 11, swing: 4, trend: 'Rising' },
    'kerala': { base: 6, swing: 3, trend: 'Rising' },
    'west bengal': { base: 8, swing: 4, trend: 'Stable' },
    'assam': { base: 5, swing: 3, trend: 'Stable' },
    'default': { base: 10, swing: 4, trend: 'Stable' }
};

/**
 * GENERATES MOCK DATA FOR FALLBACK
 */
const getFallbackData = async (station: Station): Promise<WRISApiResponse> => {
    try {
        // Try to fetch from MongoDB first
        const dbRecords = await Groundwater.find({
            'location.stationId': station.stationId
        }).sort({ date: -1 }).limit(12).lean().exec();

        if (dbRecords && dbRecords.length > 0) {
            return {
                success: true,
                data: dbRecords.map((r: any) => ({
                    date: r.date,
                    level: r.waterLevelMbgl,
                    agency: r.source || 'Local-DB'
                })),
                isFallback: true,
                warning: 'Data retrieved from local historical database'
            };
        }
    } catch (err) {
        logger.error('DB Fallback failed', err);
    }

    // Secondary fallback: Procedural Mock Data
    const stateKey = station.stateName.toLowerCase();
    const profile = stateGroundwaterProfiles[stateKey] || stateGroundwaterProfiles['default'];
    
    const data = [];
    const today = new Date();
    
    // Generate 12 months of mock data
    for (let i = 12; i >= 0; i--) {
        const d = new Date();
        d.setMonth(today.getMonth() - i);
        
        const month = d.getMonth();
        const isMonsoon = month >= 5 && month <= 9;
        
        // Base level + trend factor + seasonality + random noise
        let trendFactor = 0;
        if (profile.trend === 'Falling') trendFactor = (12 - i) * 0.1;
        if (profile.trend === 'Rising') trendFactor = (12 - i) * -0.1;

        let level = profile.base + trendFactor;
        if (isMonsoon) level -= profile.swing / 2;
        else level += profile.swing / 4;

        level += (Math.random() - 0.5) * 1; // 1m noise
        
        data.push({
            date: d.toISOString(),
            level: Math.max(0.5, Number(level.toFixed(2))),
            agency: 'SYNTHETIC-STATE-MODEL'
        });
    }

    return {
        success: true,
        data,
        isFallback: true,
        warning: `Synthetic state model fallback (${profile.trend} trend predicted for ${station.stateName})`
    };
};
