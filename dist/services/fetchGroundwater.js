"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndSaveGroundwaterData = fetchAndSaveGroundwaterData;
const axios_1 = __importDefault(require("axios"));
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = __importDefault(require("../utils/logger"));
const Groundwater_1 = require("../models/Groundwater");
const redis_1 = require("../config/redis");
// SSL fix only in development
if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    logger_1.default.warn('⚠️ SSL verification disabled for dev (WRIS fetch)');
}
// ─────────────────────────────────────────────────────────────────────────────
// New confirmed WRIS API:
//   POST https://indiawris.gov.in/Dataset/Ground%20Water%20Level
//   Params (query): stateName*, districtName*, agencyName*, startdate*, enddate*, page, size
//
// Response fields (per record in data[]):
//   stationCode, stationName, stationType,
//   latitude, longitude,
//   agencyName, state, district, tehsil, block, village,
//   wellType, wellDepth, wellAquiferType,
//   dataValue (water level in metres), dataTime, unit,
//   dataAcquisitionMode, stationStatus,
//   majorBasin, tributary, datatypeCode, description
// ─────────────────────────────────────────────────────────────────────────────
const WRIS_BASE = 'https://indiawris.gov.in/Dataset/Ground%20Water%20Level';
const POSTAL_API = 'https://api.postalpincode.in/postoffice';
// ── In-Memory + Redis Pin Cache
const pinCache = new node_cache_1.default({ stdTTL: 86400, checkperiod: 120 });
async function getCachedPin(key) {
    try {
        const redis = await (0, redis_1.getRedisClient)();
        if (!redis)
            return null;
        return await redis.get(`pin:${key}`);
    }
    catch (err) {
        logger_1.default.warn('Redis get failed – using local cache', { error: err.message });
        return null;
    }
}
async function setCachedPin(key, pin) {
    try {
        const redis = await (0, redis_1.getRedisClient)();
        if (!redis)
            return;
        await redis.set(`pin:${key}`, pin, { EX: 86400 });
    }
    catch (err) {
        logger_1.default.warn('Redis set failed – local cache only', { error: err.message });
    }
}
async function getPinCode(village, district) {
    const lookup = village?.trim() || district?.trim();
    if (!lookup)
        return null;
    const cacheKey = `${(village || '').trim().toLowerCase()}-${(district || '').trim().toLowerCase()}`;
    let pin = await getCachedPin(cacheKey);
    if (pin)
        return pin;
    const localPin = pinCache.get(cacheKey);
    if (localPin !== undefined)
        return localPin;
    try {
        const url = `${POSTAL_API}/${encodeURIComponent(lookup)}`;
        const res = await axios_1.default.get(url, { timeout: 8000 });
        if (res.data?.[0]?.Status === 'Success' && res.data[0].PostOffice?.length > 0) {
            let office = res.data[0].PostOffice[0];
            if (district) {
                const matched = res.data[0].PostOffice.find((o) => o.District?.toLowerCase() === district.toLowerCase());
                if (matched)
                    office = matched;
            }
            pin = office.Pincode;
            if (pin && /^\d{6}$/.test(pin)) {
                pinCache.set(cacheKey, pin);
                await setCachedPin(cacheKey, pin);
                logger_1.default.info(`📮 PIN cached: ${pin} for ${lookup}`);
                return pin;
            }
        }
        // Fallback: search by district
        if (district && village) {
            const distUrl = `${POSTAL_API}/${encodeURIComponent(district.trim())}`;
            const distRes = await axios_1.default.get(distUrl, { timeout: 8000 });
            if (distRes.data?.[0]?.Status === 'Success' && distRes.data[0].PostOffice?.length > 0) {
                pin = distRes.data[0].PostOffice[0].Pincode;
                if (pin && /^\d{6}$/.test(pin)) {
                    pinCache.set(cacheKey, pin);
                    await setCachedPin(cacheKey, pin);
                    logger_1.default.info(`📮 District fallback PIN: ${pin} for ${district}`);
                    return pin;
                }
            }
        }
        return null;
    }
    catch (error) {
        logger_1.default.warn('PIN API failed', { error: error.message });
        return null;
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Main fetch function – fetches data from WRIS and saves to MongoDB
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAndSaveGroundwaterData(state, district, agencyName = 'CGWB', startdate = '2023-01-01', enddate = new Date().toISOString().split('T')[0]) {
    logger_1.default.info(`🌊 Starting WRIS fetch → State: ${state}` +
        (district ? ` | District: ${district}` : '') +
        ` | Agency: ${agencyName}`);
    logger_1.default.info(`📅 Date range: ${startdate} → ${enddate}`);
    let page = 0;
    const size = 500;
    let totalSaved = 0;
    let totalFetched = 0;
    while (true) {
        const params = {
            stateName: state,
            agencyName,
            startdate,
            enddate,
            page,
            size,
        };
        if (district) {
            params.districtName = district;
        }
        let records = [];
        let retries = 0;
        while (retries < 3) {
            try {
                logger_1.default.info(`📡 Fetching page ${page} (size=${size})...`);
                const res = await axios_1.default.post(WRIS_BASE, null, { params, timeout: 40000 });
                const { statusCode, message, data } = res.data;
                logger_1.default.info(`✅ API Response: ${statusCode} — ${message}`);
                if (statusCode !== 200 || !Array.isArray(data)) {
                    logger_1.default.warn(`⚠️ Unexpected response: ${JSON.stringify(res.data).substring(0, 200)}`);
                    return;
                }
                records = data;
                break;
            }
            catch (err) {
                retries++;
                logger_1.default.error(`❌ Page ${page} fetch failed (attempt ${retries}/3): ${err.message}`);
                if (retries >= 3)
                    break;
                await new Promise(r => setTimeout(r, 2000 * retries));
            }
        }
        if (!records.length) {
            logger_1.default.info(`✅ No more records at page ${page}. Done.`);
            break;
        }
        totalFetched += records.length;
        logger_1.default.info(`📊 Got ${records.length} records on page ${page}.`);
        // ── Log output fields on first page
        if (page === 0) {
            logger_1.default.info('📋 API Output fields: ' + Object.keys(records[0]).join(', '));
        }
        // ── Build MongoDB upsert operations
        const bulkOps = await Promise.all(records.map(async (r) => {
            // dataValue is the water level in metres (can be negative = depth below surface)
            const waterLevel = typeof r.dataValue === 'number' ? r.dataValue : null;
            if (waterLevel === null || isNaN(waterLevel))
                return null;
            const measurementDate = r.dataTime ? new Date(r.dataTime) : null;
            if (!measurementDate || isNaN(measurementDate.getTime()))
                return null;
            const pinCode = await getPinCode(r.village, r.district);
            const doc = {
                location: {
                    state: r.state?.trim() || '',
                    district: r.district?.trim() || null,
                    block: r.block?.trim() || null,
                    tehsil: r.tehsil?.trim() || null,
                    village: r.village?.trim() || null,
                    pinCode,
                    stationId: r.stationCode || null,
                    stationName: r.stationName || null,
                    coordinates: r.latitude && r.longitude
                        ? { type: 'Point', coordinates: [r.longitude, r.latitude] }
                        : undefined,
                },
                date: measurementDate,
                waterLevelMbgl: Math.abs(waterLevel), // store as positive MBGL
                dataValue: waterLevel, // raw API value (can be negative)
                unit: r.unit || 'm',
                wellType: r.wellType || null,
                wellDepth: r.wellDepth || null,
                wellAquiferType: r.wellAquiferType || null,
                agencyName: r.agencyName || agencyName,
                stationType: r.stationType || 'Ground Water',
                stationStatus: r.stationStatus || null,
                dataAcquisitionMode: r.dataAcquisitionMode || null,
                majorBasin: r.majorBasin || null,
                tributary: r.tributary || null,
                source: 'WRIS-AdminAPI',
            };
            if (!doc.location.state)
                return null;
            // Log record summary
            logger_1.default.info(`📍 ${r.stationCode} | ${r.district} | ${r.village ?? '-'} | PIN: ${pinCode ?? 'N/A'} | WL: ${waterLevel}m | Date: ${r.dataTime}`);
            return {
                updateOne: {
                    filter: {
                        'location.stationId': doc.location.stationId,
                        date: doc.date,
                    },
                    update: { $set: doc },
                    upsert: true,
                },
            };
        }));
        const validOps = bulkOps.filter(op => op !== null);
        if (validOps.length > 0) {
            const result = await Groundwater_1.Groundwater.bulkWrite(validOps, { ordered: false });
            const saved = result.modifiedCount + result.upsertedCount;
            totalSaved += saved;
            logger_1.default.info(`💾 Page ${page}: ${saved} records saved (${validOps.length} valid of ${records.length} fetched).`);
        }
        page++;
        if (records.length < size)
            break; // last page reached
    }
    logger_1.default.info(totalSaved > 0
        ? `🎉 Completed: ${totalSaved} records saved out of ${totalFetched} fetched for ${state}/${district}`
        : `⚠️  No valid records saved for ${state}/${district}`);
}
//# sourceMappingURL=fetchGroundwater.js.map