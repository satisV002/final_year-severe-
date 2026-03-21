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
        if (!fs_1.default.existsSync(filePath)) {
            console.error(`[StationLoader] stations.json not found at ${filePath}. Starting with empty station list.`);
            stationsCache = [];
            isLoaded = true;
            return;
        }
        const fileData = fs_1.default.readFileSync(filePath, 'utf-8');
        const rawStations = JSON.parse(fileData);
        if (!Array.isArray(rawStations)) {
            throw new Error('stations.json must be an array');
        }
        let idCounter = 1;
        stationsCache = rawStations.map((station) => {
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
        }).filter((s) => !isNaN(s.lat) && !isNaN(s.lng));
        isLoaded = true;
        console.log(`[StationLoader] Successfully loaded ${stationsCache.length} stations into memory cache.`);
    }
    catch (error) {
        console.error('[StationLoader] Failed to load stations:', error.message);
        stationsCache = []; // Safe fallback
        isLoaded = true;
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