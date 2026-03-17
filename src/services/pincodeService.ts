// src/services/pincodeService.ts
import axios from 'axios';
import NodeCache from 'node-cache';
import logger from '../utils/logger';

const pinCache = new NodeCache({ stdTTL: 86400, checkperiod: 120 }); // 24 hours TTL

/**
 * Place/Village name base chesi possible PIN codes teesukuntundi
 * @param placeName Village or place name (e.g., "Kakinada", "Kukatpally")
 * @param district Optional - better accuracy & filtering kosam
 * @returns Array of matching PINs with post office & district
 */
export async function getAllPincodesForPlace(
  placeName: string,
  district?: string
): Promise<Array<{ pincode: string; postOffice: string; district: string }>> {
  if (!placeName?.trim()) {
    logger.debug('PIN suggest skipped - empty placeName');
    return [];
  }

  const normalizedPlace = placeName.trim();
  const normalizedDistrict = district?.trim().toLowerCase();

  const cacheKey = `allpins_${normalizedPlace.toLowerCase()}_${normalizedDistrict || 'no_district'}`;
  const cached = pinCache.get<Array<{ pincode: string; postOffice: string; district: string }>>(cacheKey);
  if (cached) {
    logger.debug(`PIN cache hit for ${cacheKey} → ${cached.length} results`);
    return cached;
  }

  try {
    const url = `https://api.postalpincode.in/postoffice/${encodeURIComponent(normalizedPlace)}`;
    logger.debug(`Calling PIN API`, { url, place: normalizedPlace, district: normalizedDistrict });

    const response = await axios.get(url, { timeout: 10000 }); // increased timeout slightly

    const apiData = response.data?.[0];

    if (!apiData || apiData.Status !== 'Success' || !apiData.PostOffice?.length) {
      logger.info(`No PINs found for place: ${normalizedPlace} (Status: ${apiData?.Status || 'unknown'})`);
      return [];
    }

    let offices = apiData.PostOffice;

    // District filter (more flexible: includes partial match)
    if (normalizedDistrict) {
      offices = offices.filter((office: any) =>
        office.District?.toLowerCase().includes(normalizedDistrict)
      );
    }

    const pincodes = offices.map((office: any) => ({
      pincode: office.Pincode,
      postOffice: office.Name,
      district: office.District,
    }));

    // Cache only if we have results
    if (pincodes.length > 0) {
      pinCache.set(cacheKey, pincodes);
      logger.info(`Cached ${pincodes.length} PINs for ${normalizedPlace} (key: ${cacheKey})`);
    } else {
      logger.info(`No matching PINs after district filter for ${normalizedPlace}`);
    }

    return pincodes;
  } catch (error: any) {
    logger.error('PIN API error', {
      place: normalizedPlace,
      district: normalizedDistrict,
      message: error.message,
      code: error.code,
      responseStatus: error.response?.status,
    });
    return [];
  }
}