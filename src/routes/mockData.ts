import { Router } from 'express';
import { IGroundwaterData } from '../types';

const router = Router();

// Generate 500 records across top 5 districts in Telangana
const MOCK_STATIONS = [
    { id: 'CGWB-TL01', name: 'Hyderabad Central', district: 'Hyderabad', lat: 17.385, lng: 78.4866 },
    { id: 'CGWB-TL02', name: 'Medchal Rural', district: 'Medchal', lat: 17.629, lng: 78.481 },
    { id: 'CGWB-TL03', name: 'Rangareddy Deep', district: 'Rangareddy', lat: 17.333, lng: 78.333 },
    { id: 'CGWB-TL04', name: 'Nizamabad North', district: 'Nizamabad', lat: 18.672, lng: 78.094 },
    { id: 'CGWB-TL05', name: 'Warangal Urban', district: 'Warangal', lat: 18.000, lng: 79.583 },
];

const mockData: IGroundwaterData[] = [];
// Generate monthly data from 2018 to 2024 (7 years = 84 months) for 6 stations = 504 records
let idCounter = 1;
const START_YEAR = 2018;

MOCK_STATIONS.forEach(st => {
    let baseLevel = 8 + Math.random() * 5; // Base water level between 8m and 13m

    for (let year = START_YEAR; year <= 2024; year++) {
        for (let month = 0; month < 12; month++) {
            // Create seasonal variation (monsoon brings water level up / mbgl down in months 6-9)
            const isMonsoon = month >= 5 && month <= 9;
            // Slight decline over years
            const yearlyDecline = (year - START_YEAR) * 0.2;

            let variance = (Math.random() - 0.5) * 1.5;
            if (isMonsoon) {
                variance -= 2; // Water level drops (improves) during monsoon
            } else {
                variance += 0.5; // Water level rises (depletes) during summer
            }

            let level = baseLevel + yearlyDecline + variance;
            if (level < 2) level = 2; // Cap min depth

            const rainfall = isMonsoon ? 150 + Math.random() * 200 : 10 + Math.random() * 40;

            const prevLevel = level + (Math.random() - 0.5);
            const trend = level < prevLevel ? 'Rising' : level > prevLevel + 0.5 ? 'Falling' : 'Stable';

            const date = new Date(Date.UTC(year, month, 15));

            mockData.push({
                _id: `mock-${idCounter++}` as any,
                location: {
                    state: 'Telangana',
                    district: st.district,
                    village: st.name,
                    stationId: st.id,
                    pinCode: '500001',
                    coordinates: { type: 'Point', coordinates: [st.lng, st.lat] }
                },
                date,
                waterLevelMbgl: Number(level.toFixed(2)),
                // @ts-ignore
                rainfall: Number(rainfall.toFixed(1)),
                trend,
                source: 'WRIS',
                year,
                month: month + 1
            });
        }
    }
});

// GET /api/v1/mock/groundwater
router.get('/groundwater', (req, res) => {
    const { state, district, page = '1', limit = '100', sort = 'date:-1' } = req.query;

    let filtered = [...mockData];

    if (state) {
        filtered = filtered.filter(d => d.location.state.toLowerCase().includes((state as string).toLowerCase()));
    }
    if (district) {
        filtered = filtered.filter(d => (d.location.district ?? '').toLowerCase().includes((district as string).toLowerCase()));
    }

    // Sorting
    const [sortField, sortOrder] = (sort as string).split(':');
    filtered.sort((a, b) => {
        let valA: any = sortField === 'date' ? (a.date instanceof Date ? a.date : new Date(a.date)).getTime() : a.waterLevelMbgl;
        let valB: any = sortField === 'date' ? (b.date instanceof Date ? b.date : new Date(b.date)).getTime() : b.waterLevelMbgl;
        return sortOrder === '1' ? valA - valB : valB - valA;
    });

    const p = Math.max(1, parseInt(page as string, 10));
    const l = parseInt(limit as string, 10) || 100;

    const start = (p - 1) * l;
    const paginated = filtered.slice(start, start + l);

    res.json({
        success: true,
        data: paginated,
        pagination: {
            page: p,
            limit: l,
            totalPages: Math.ceil(filtered.length / l),
            totalRecords: filtered.length
        },
        message: '500+ Mock records generated successfully'
    });
});

// Summary Endpoint for quick charting
router.get('/summary', (req, res) => {
    res.json({
        success: true,
        totalRecords: mockData.length,
        districts: [...new Set(mockData.map(d => d.location.district))],
        avgLevel: Number((mockData.reduce((a, b) => a + b.waterLevelMbgl, 0) / mockData.length).toFixed(2)),
        data: mockData
    });
});

export default router;
