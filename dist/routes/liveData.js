"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stationLoader_service_1 = require("../services/stationLoader.service");
const rainfallLoader_service_1 = require("../services/rainfallLoader.service");
const liveGroundwater_service_1 = require("../services/liveGroundwater.service");
const catchAsync_1 = require("../utils/catchAsync");
const router = (0, express_1.Router)();
// GET /api/stations
router.get('/stations', (0, catchAsync_1.catchAsync)(async (req, res) => {
    const stations = (0, stationLoader_service_1.getAllStations)();
    res.json({ success: true, count: stations.length, data: stations });
}));
// GET /api/station/:stationId
router.get('/station/:stationId', (0, catchAsync_1.catchAsync)(async (req, res) => {
    const stationId = req.params.stationId;
    const station = (0, stationLoader_service_1.getStationById)(stationId);
    if (!station) {
        return res.status(404).json({ success: false, error: 'Station not found' });
    }
    res.json({ success: true, data: station });
}));
// GET /api/rainfall/station/:stationId
router.get('/rainfall/station/:stationId', (0, catchAsync_1.catchAsync)(async (req, res) => {
    const stationId = req.params.stationId;
    const rainfallData = (0, rainfallLoader_service_1.getRainfallTrend)(stationId);
    if (!rainfallData) {
        return res.status(404).json({ success: false, error: 'Rainfall data not found for this station/region' });
    }
    res.json({ success: true, data: rainfallData });
}));
// GET /api/live-groundwater/:stationId
router.get('/live-groundwater/:stationId', (0, catchAsync_1.catchAsync)(async (req, res) => {
    const stationId = req.params.stationId;
    const wrisResult = await (0, liveGroundwater_service_1.fetchLiveGroundwater)(stationId);
    if (!wrisResult.success) {
        return res.status(503).json(wrisResult);
    }
    res.json(wrisResult);
}));
// GET /api/analysis/:stationId
router.get('/analysis/:stationId', (0, catchAsync_1.catchAsync)(async (req, res) => {
    const stationId = req.params.stationId;
    // 1. Fetch live groundwater
    const wrisResult = await (0, liveGroundwater_service_1.fetchLiveGroundwater)(stationId);
    let groundwaterTrend = 'Unknown';
    if (wrisResult.success && wrisResult.data && wrisResult.data.length >= 2) {
        const sorted = wrisResult.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const oldest = sorted[0].level;
        const newest = sorted[sorted.length - 1].level;
        if (newest < oldest)
            groundwaterTrend = 'Increasing';
        else if (newest > oldest)
            groundwaterTrend = 'Decreasing';
        else
            groundwaterTrend = 'Stable';
    }
    else if (wrisResult.success && wrisResult.data && wrisResult.data.length === 0) {
        groundwaterTrend = 'No Data';
    }
    // 2. Fetch rainfall data
    const rainfallData = (0, rainfallLoader_service_1.getRainfallTrend)(stationId);
    const rainfallTrend = rainfallData ? rainfallData.trend : 'Unknown';
    // 3. Calculate impact
    let impact = 'Unknown Impact';
    if (groundwaterTrend === 'Unknown' || groundwaterTrend === 'No Data') {
        impact = 'Insufficient Groundwater Data';
    }
    else if (rainfallTrend === 'Increasing' && groundwaterTrend === 'Decreasing') {
        impact = 'Recharge Possible — Requires harvesting intervention';
    }
    else if (rainfallTrend === 'Decreasing' && groundwaterTrend === 'Decreasing') {
        impact = 'High Risk of Depletion';
    }
    else if (rainfallTrend === 'Increasing' && groundwaterTrend === 'Increasing') {
        impact = 'Healthy Recharge occurring naturally';
    }
    else {
        impact = 'Stable condition';
    }
    const station = (0, stationLoader_service_1.getStationById)(stationId);
    res.json({
        success: true,
        data: {
            station: station?.stationName || stationId,
            groundwaterTrend,
            rainfallTrend,
            impact,
            stationDetails: station
        }
    });
}));
exports.default = router;
//# sourceMappingURL=liveData.js.map