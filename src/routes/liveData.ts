import { Router } from 'express';
import { getAllStations, getStationById } from '../services/stationLoader.service';
import { getRainfallTrend } from '../services/rainfallLoader.service';
import { fetchLiveGroundwater } from '../services/liveGroundwater.service';

const router = Router();

// GET /api/stations
// Returns all stations for India
router.get('/stations', (req, res) => {
    try {
        const stations = getAllStations();
        res.json({ success: true, count: stations.length, data: stations });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch stations' });
    }
});

// GET /api/station/:stationId
// Returns single station details
router.get('/station/:stationId', (req, res) => {
    try {
        const { stationId } = req.params;
        const station = getStationById(stationId);

        if (!station) {
            return res.status(404).json({ success: false, error: 'Station not found' });
        }

        res.json({ success: true, data: station });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch station details' });
    }
});

// GET /api/rainfall/station/:stationId
// Returns rainfall data for a specific station
router.get('/rainfall/station/:stationId', (req, res) => {
    try {
        const { stationId } = req.params;
        const rainfallData = getRainfallTrend(stationId);

        if (!rainfallData) {
            return res.status(404).json({ success: false, error: 'Rainfall data not found for this station/region' });
        }

        res.json({ success: true, data: rainfallData });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch rainfall data' });
    }
});

// GET /api/live-groundwater/:stationId
// Fetches live data from WRIS API directly to frontend
router.get('/live-groundwater/:stationId', async (req, res) => {
    try {
        const { stationId } = req.params;
        const wrisResult = await fetchLiveGroundwater(stationId);

        if (!wrisResult.success) {
            // It might be a timeout or error
            return res.status(503).json(wrisResult);
        }

        res.json(wrisResult);
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Internal server error while fetching live data' });
    }
});

// GET /api/analysis/:stationId
// Intelligent Combined Endpoint
router.get('/analysis/:stationId', async (req, res) => {
    try {
        const { stationId } = req.params;

        // 1. Fetch live groundwater
        const wrisResult = await fetchLiveGroundwater(stationId);
        let groundwaterTrend = 'Unknown';
        if (wrisResult.success && wrisResult.data && wrisResult.data.length >= 2) {
            // Sort oldest to newest
            const sorted = wrisResult.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const oldest = sorted[0].level;
            const newest = sorted[sorted.length - 1].level;
            // Note: "Level" is usually depth to water. So higher number = deeper water (worse).
            // Decreasing depth to water = Increasing groundwater volume.
            if (newest < oldest) groundwaterTrend = 'Increasing';
            else if (newest > oldest) groundwaterTrend = 'Decreasing';
            else groundwaterTrend = 'Stable';
        } else if (wrisResult.success && wrisResult.data && wrisResult.data.length === 0) {
            groundwaterTrend = 'No Data';
        }

        // 2. Fetch rainfall data
        const rainfallData = getRainfallTrend(stationId);
        const rainfallTrend = rainfallData ? rainfallData.trend : 'Unknown';

        // 3. Calculate impact
        let impact = 'Unknown Impact';
        if (groundwaterTrend === 'Unknown' || groundwaterTrend === 'No Data') {
            impact = 'Insufficient Groundwater Data';
        } else if (rainfallTrend === 'Increasing' && groundwaterTrend === 'Decreasing') {
            impact = 'Recharge Possible — Requires harvesting intervention';
        } else if (rainfallTrend === 'Decreasing' && groundwaterTrend === 'Decreasing') {
            impact = 'High Risk of Depletion';
        } else if (rainfallTrend === 'Increasing' && groundwaterTrend === 'Increasing') {
            impact = 'Healthy Recharge occurring naturally';
        } else {
            impact = 'Stable condition';
        }

        const station = getStationById(stationId);

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

    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Analysis failed' });
    }
});

export default router;
