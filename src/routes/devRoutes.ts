import { Router } from 'express';
import { getAllStations } from '../services/stationLoader.service';
import { getRainfallTrend } from '../services/rainfallLoader.service';
import { fetchLiveGroundwater } from '../services/liveGroundwater.service';
import axios from 'axios';

const router = Router();

// /dev/check-stations
router.get('/check-stations', (req, res) => {
    const stations = getAllStations();
    if (stations.length > 0) {
        res.json({ success: true, count: stations.length, status: 'Stations loaded correctly from memory.' });
    } else {
        res.status(500).json({ success: false, status: 'No stations found in memory.' });
    }
});

// /dev/check-groundwater
router.get('/check-groundwater', async (req, res) => {
    try {
        // Pick first station for test
        const stations = getAllStations();
        if (stations.length === 0) return res.status(500).json({ success: false, status: 'No stations available for testing' });

        // Choose one arbitrarily
        const testStation = stations[0].stationId;
        if (!testStation) return res.status(500).json({ success: false, status: 'Invalid station for testing' });

        const result = await fetchLiveGroundwater(testStation);
        res.json({ success: true, testStation, result });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// /dev/check-rainfall
router.get('/check-rainfall', (req, res) => {
    // Use a hardcoded known valid state-district combo based on mock data
    // telangana-hyderabad
    const result = getRainfallTrend('telangana-hyderabad-dummy-station');
    // Wait, getRainfallTrend expects stationId which maps to station.
    // To test without knowing a valid station ID that exists in both, we will just grab a station we know is from Telangana
    const stations = getAllStations();
    const tsStation = stations.find(s => s.stateName.toLowerCase() === 'telangana' && s.districtName.toLowerCase() === 'hyderabad');

    if (tsStation && tsStation.stationId) {
        const rf = getRainfallTrend(tsStation.stationId);
        res.json({ success: true, station: tsStation, rainfall: rf });
    } else {
        res.json({ success: false, message: 'Could not find a Telangana-Hyderabad station in memory to test.' });
    }
});

// /dev/check-analysis
router.get('/check-analysis', async (req, res) => {
    try {
        const stations = getAllStations();
        if (stations.length === 0) return res.status(500).json({ success: false, status: 'No stations available for testing' });

        // Select a station in Telangana to leverage the mock rainfall dataset ideally
        let testStation = stations.find(s => s.stateName.toLowerCase() === 'telangana')?.stationId;
        if (!testStation) testStation = stations[0].stationId; // fallback

        if (!testStation) return res.status(500).json({ success: false, status: 'Invalid station for testing' });

        // Internal fetch 
        const response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/analysis/${testStation}`);
        res.json({ success: true, testStation, result: response.data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
