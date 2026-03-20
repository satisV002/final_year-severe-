"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStationById = exports.getAllStations = exports.loadStations = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// In-memory cache for stations
let stationsCache = [];
let isLoaded = false;
const loadStations = () => {
    if (isLoaded)
        return;
    try {
        const filePath = path_1.default.join(__dirname, '../data/stations.json');
        const fileData = fs_1.default.readFileSync(filePath, 'utf-8');
        const rawStations = JSON.parse(fileData);
        let idCounter = 1;
        stationsCache = rawStations.map((station) => {
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
        }).filter((s) => !isNaN(s.lat) && !isNaN(s.lng)); // Filter out invalid coordinates
        isLoaded = true;
        console.log(`[StationLoader] Successfully loaded ${stationsCache.length} stations into memory cache.`);
    }
    catch (error) {
        console.error('[StationLoader] Failed to load stations:', error);
    }
};
exports.loadStations = loadStations;
const getAllStations = () => {
    if (!isLoaded) {
        console.warn('[StationLoader] Stations not loaded yet. Loading now...');
        (0, exports.loadStations)();
    }
    return stationsCache;
};
exports.getAllStations = getAllStations;
const getStationById = (stationId) => {
    const stations = (0, exports.getAllStations)();
    return stations.find(s => s.stationId === stationId);
};
exports.getStationById = getStationById;
//# sourceMappingURL=stationLoader.service.js.map