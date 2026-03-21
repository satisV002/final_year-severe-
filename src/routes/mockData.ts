import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

let allStations: any[] = [];
try {
    const stationsPath = path.join(__dirname, '../data/stations.json');
    const data = fs.readFileSync(stationsPath, 'utf8');
    allStations = JSON.parse(data);
    console.log(`Loaded ${allStations.length} stations into memory for mock data serving.`);
} catch (e) {
    console.error('Error loading stations.json:', e);
}

// GET /api/v1/mock/groundwater
router.get('/groundwater', catchAsync(async (req, res) => {
    const { state, district, page = '1', limit = '100', sort = 'date:-1' } = req.query;

    let filtered = allStations;

    if (state && typeof state === 'string' && state !== 'All India' && state !== 'all') {
        filtered = filtered.filter(s => s.State_Name && s.State_Name.toLowerCase().includes(state.toLowerCase()));
    }
    if (district && typeof district === 'string') {
        filtered = filtered.filter(s => s.District_Name && s.District_Name.toLowerCase().includes(district.toLowerCase()));
    }

    const p = Math.max(1, parseInt(page as string, 10));
    const l = Math.min(parseInt(limit as string, 10) || 100, 2000); 

    let stationsToMock = [...filtered];
    if ((!state || state === 'All India') && stationsToMock.length > l) {
        stationsToMock = stationsToMock.sort((a,b) => (a.Station_Name || '').localeCompare(b.Station_Name || ''));
        const step = Math.max(1, Math.floor(stationsToMock.length / l));
        stationsToMock = stationsToMock.filter((_, idx) => idx % step === 0).slice(0, l);
    } else {
        const start = (p - 1) * l;
        stationsToMock = stationsToMock.slice(start, start + l);
    }

    const transformed: any[] = [];
    const today = new Date();

    stationsToMock.forEach((st, i) => {
        const seed = Math.abs((st.Latitude || 17) * (st.Longitude || 78));
        const stationId = `${st.State_Name?.substring(0,2)}-${i}-${st.Station_Name?.substring(0,3)}`.toUpperCase();

        for (let m = 0; m < 12; m++) {
            const d = new Date(today.getFullYear(), today.getMonth() - m, 15);
            const month = d.getMonth() + 1;
            const isMonsoon = month >= 6 && month <= 9;
            
            const baseLevel = 2 + (seed % 15) + (isMonsoon ? -2 : 2); 
            const rain = isMonsoon ? (150 + (seed % 300)) : (5 + (seed % 20));

            transformed.push({
                _id: `mock-${stationId}-${m}`,
                location: {
                    state: st.State_Name,
                    district: st.District_Name,
                    village: st.Station_Name || st.Tahsil_Name,
                    stationId: stationId,
                    pinCode: '000000',
                    coordinates: { type: 'Point', coordinates: [st.Longitude, st.Latitude] }
                },
                date: d.toISOString(),
                waterLevelMbgl: Number(baseLevel.toFixed(2)),
                rainfall: Number(rain.toFixed(1)),
                trend: (seed % 3) < 1 ? 'Rising' : (seed % 3) < 2 ? 'Falling' : 'Stable',
                source: st.Agency_Name || 'WRIS/Local',
                year: d.getFullYear(),
                month: month
            });
        }
    });

    res.json({
        success: true,
        data: transformed,
        pagination: {
            page: p,
            limit: l,
            totalPages: Math.ceil(filtered.length / l),
            totalRecords: transformed.length
        },
        message: 'Mock records generated with 12-month history for dashboard consistency'
    });
}));


// Summary Endpoint for quick charting
router.get('/summary', catchAsync(async (req, res) => {
    res.json({
        success: true,
        totalRecords: allStations.length,
        districts: [], 
        avgLevel: 10.5,
        data: [] 
    });
}));


export default router;
