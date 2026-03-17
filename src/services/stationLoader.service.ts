import fs from 'fs';
import path from 'path';

export interface Station {
    stationId: string;
    stationName: string;
    stateName: string;
    districtName: string;
    villageName: string;
    lat: number;
    lng: number;
    agencyName: string;
}

// In-memory cache for stations
let stationsCache: Station[] = [];
let isLoaded = false;

export const loadStations = (): void => {
    if (isLoaded) return;

    try {
        const filePath = path.join(__dirname, '../data/stations.json');
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const rawStations = JSON.parse(fileData);

        let idCounter = 1;
        stationsCache = rawStations.map((station: any) => {
            // Generate a simple unique ID for each station since it's not present in the source dataset
            const stationId = `STN-${station.State_Name?.substring(0, 2)}-${idCounter++}`.toUpperCase();

            return {
                stationId,
                stationName: station.Station_Name || '',
                stateName: station.State_Name || '',
                districtName: station.District_Name || '',
                villageName: station.Tahsil_Name || '',
                lat: Number(station.Latitude),
                lng: Number(station.Longitude),
                agencyName: station.Agency_Name || 'CGWB'
            };
        }).filter((s: Station) => !isNaN(s.lat) && !isNaN(s.lng)); // Filter out invalid coordinates

        isLoaded = true;
        console.log(`[StationLoader] Successfully loaded ${stationsCache.length} stations into memory cache.`);
    } catch (error) {
        console.error('[StationLoader] Failed to load stations:', error);
    }
};

export const getAllStations = (): Station[] => {
    if (!isLoaded) {
        console.warn('[StationLoader] Stations not loaded yet. Loading now...');
        loadStations();
    }
    return stationsCache;
};

export const getStationById = (stationId: string): Station | undefined => {
    const stations = getAllStations();
    return stations.find(s => s.stationId === stationId);
};
