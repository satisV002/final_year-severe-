import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// New WRIS API endpoint confirmed from Swagger:
//   POST https://indiawris.gov.in/Dataset/Ground%20Water%20Level
//   operationId: getGroundWaterLevel
//   Tag: "Data API Based On Admin Hierarchy"
//
// Required query params:
//   stateName    – e.g. "Odisha"
//   districtName – e.g. "Baleshwar"
//   agencyName   – e.g. "CGWB"
//   startdate    – e.g. "2023-01-01"
//   enddate      – e.g. "2024-01-01"
//   page         – 0-indexed page number
//   size         – records per page (max 1000)
//
// Response shape (statusCode 200):
// {
//   statusCode: 200,
//   message: "Data fetched successfully",
//   data: [
//     {
//       stationCode, stationName, stationType,
//       latitude, longitude,
//       agencyName, state, district, tehsil, block, village,
//       wellType, wellDepth, wellAquiferType,
//       dataValue,   ← water level in metres (can be negative = below surface)
//       dataTime,    ← ISO date string of the measurement
//       unit,        ← "m"
//       dataAcquisitionMode, stationStatus,
//       majorBasin, tributary,
//       datatypeCode, description
//     }, ...
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────

const WRIS_BASE = 'https://indiawris.gov.in/Dataset/Ground%20Water%20Level';
const POSTAL_API = 'https://api.postalpincode.in/postoffice';

/** Fetch pincode from India Post API using village/district name */
async function fetchPincode(village: string | null, district: string): Promise<string | null> {
    const lookup = village || district;
    if (!lookup) return null;
    try {
        const res = await axios.get(`${POSTAL_API}/${encodeURIComponent(lookup.trim())}`, { timeout: 8000 });
        const offices = res.data?.[0]?.PostOffice ?? [];
        if (!offices.length) {
            // fallback: search by district
            if (village) {
                const r2 = await axios.get(`${POSTAL_API}/${encodeURIComponent(district.trim())}`, { timeout: 8000 });
                const d_offices = r2.data?.[0]?.PostOffice ?? [];
                if (d_offices.length) return d_offices[0].Pincode ?? null;
            }
            return null;
        }
        // prefer matching district
        const matched = offices.find((o: any) => o.District?.toLowerCase() === district.toLowerCase());
        return (matched ?? offices[0]).Pincode ?? null;
    } catch {
        return null;
    }
}

async function fetchGroundwaterData() {
    const params = {
        stateName: 'Odisha',
        districtName: 'Baleshwar',
        agencyName: 'CGWB',
        startdate: '2023-01-01',
        enddate: '2024-01-01',
        page: 0,
        size: 5,
    };

    console.log('\n📡 Fetching Groundwater data from WRIS API...');
    console.log('Params:', params);

    try {
        const response = await axios.post(WRIS_BASE, null, { params, timeout: 30000 });
        const { statusCode, message, data } = response.data;

        console.log(`\n✅ Response status: ${statusCode} — ${message}`);
        console.log(`📊 Total records returned: ${data?.length ?? 0}`);

        if (!data?.length) {
            console.warn('⚠️  No records in response.');
            return;
        }

        // ── Print header of available output fields (from the first record)
        console.log('\n📋 OUTPUT FIELDS AVAILABLE FROM THIS API:');
        const fields = Object.keys(data[0]);
        fields.forEach(f => console.log(`   • ${f}`));

        // ── Process each record + enrich with Pincode
        console.log('\n📝 RECORDS:');
        for (const record of data) {
            const pinCode = await fetchPincode(record.village, record.district);

            console.log('\n─────────────────────────────────────────');
            console.log('stationCode     :', record.stationCode);
            console.log('stationName     :', record.stationName);
            console.log('stationType     :', record.stationType);
            console.log('agencyName      :', record.agencyName);
            console.log('state           :', record.state);
            console.log('district        :', record.district);
            console.log('tehsil          :', record.tehsil);
            console.log('block           :', record.block);
            console.log('village         :', record.village);
            console.log('📮 pinCode      :', pinCode ?? 'N/A');
            console.log('latitude        :', record.latitude);
            console.log('longitude       :', record.longitude);
            console.log('wellType        :', record.wellType);
            console.log('wellDepth (m)   :', record.wellDepth);
            console.log('wellAquiferType :', record.wellAquiferType);
            console.log('waterLevel (m)  :', record.dataValue);
            console.log('unit            :', record.unit);
            console.log('measurementTime :', record.dataTime);
            console.log('stationStatus   :', record.stationStatus);
            console.log('acqMode         :', record.dataAcquisitionMode);
            console.log('majorBasin      :', record.majorBasin);
            console.log('tributary       :', record.tributary);
        }
    } catch (error: any) {
        console.error('\n❌ Error fetching data:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

fetchGroundwaterData();
