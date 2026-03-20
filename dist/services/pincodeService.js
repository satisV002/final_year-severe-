"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPincodesForPlace = getAllPincodesForPlace;
// src/services/pincodeService.ts
const axios_1 = __importDefault(require("axios"));
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = __importDefault(require("../utils/logger"));
const pinCache = new node_cache_1.default({ stdTTL: 86400, checkperiod: 120 }); // 24 hours TTL
/**
 * Place/Village name base chesi possible PIN codes teesukuntundi
 * @param placeName Village or place name (e.g., "Kakinada", "Kukatpally")
 * @param district Optional - better accuracy & filtering kosam
 * @returns Array of matching PINs with post office & district
 */
async function getAllPincodesForPlace(placeName, district) {
    if (!placeName?.trim()) {
        logger_1.default.debug('PIN suggest skipped - empty placeName');
        return [];
    }
    const normalizedPlace = placeName.trim();
    const normalizedDistrict = district?.trim().toLowerCase();
    const cacheKey = `allpins_${normalizedPlace.toLowerCase()}_${normalizedDistrict || 'no_district'}`;
    const cached = pinCache.get(cacheKey);
    if (cached) {
        logger_1.default.debug(`PIN cache hit for ${cacheKey} → ${cached.length} results`);
        return cached;
    }
    try {
        const url = `https://api.postalpincode.in/postoffice/${encodeURIComponent(normalizedPlace)}`;
        logger_1.default.debug(`Calling PIN API`, { url, place: normalizedPlace, district: normalizedDistrict });
        const response = await axios_1.default.get(url, { timeout: 10000 }); // increased timeout slightly
        const apiData = response.data?.[0];
        if (!apiData || apiData.Status !== 'Success' || !apiData.PostOffice?.length) {
            logger_1.default.info(`No PINs found for place: ${normalizedPlace} (Status: ${apiData?.Status || 'unknown'})`);
            return [];
        }
        let offices = apiData.PostOffice;
        // District filter (more flexible: includes partial match)
        if (normalizedDistrict) {
            offices = offices.filter((office) => office.District?.toLowerCase().includes(normalizedDistrict));
        }
        const pincodes = offices.map((office) => ({
            pincode: office.Pincode,
            postOffice: office.Name,
            district: office.District,
        }));
        // Cache only if we have results
        if (pincodes.length > 0) {
            pinCache.set(cacheKey, pincodes);
            logger_1.default.info(`Cached ${pincodes.length} PINs for ${normalizedPlace} (key: ${cacheKey})`);
        }
        else {
            logger_1.default.info(`No matching PINs after district filter for ${normalizedPlace}`);
        }
        return pincodes;
    }
    catch (error) {
        logger_1.default.error('PIN API error', {
            place: normalizedPlace,
            district: normalizedDistrict,
            message: error.message,
            code: error.code,
            responseStatus: error.response?.status,
        });
        return [];
    }
}
//# sourceMappingURL=pincodeService.js.map