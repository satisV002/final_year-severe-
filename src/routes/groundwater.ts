import express from 'express';
import { Groundwater } from '../models/Groundwater';
import { validateQueryParams } from '../middleware/validate';
import logger from '../utils/logger';
import { getAllPincodesForPlace } from '../services/pincodeService';
import { sendDataToML } from '../services/mlService';
import { env } from '../config/env';
import { IGroundwaterData } from '../types';

const router = express.Router();

// GET /api/v1/groundwater
router.get('/groundwater', validateQueryParams, async (req, res) => {
  try {
    const {
      state,
      district,
      village,
      pinCode,
      stationName,  // ← NEW: optional filter by station name
      fromDate,
      toDate,
      page = '1',
      limit = '20',
      sort = 'date:-1',
    } = req.query;

    const query: any = {
      'location.state': { $regex: new RegExp(state as string, 'i') },
      // COMMENTED OUT — we want to show stations even if water level is null/missing
      // waterLevelMbgl: { $ne: null, $exists: true },
    };

    if (district) query['location.district'] = { $regex: new RegExp(district as string, 'i') };
    if (village) query['location.village'] = { $regex: new RegExp(village as string, 'i') };
    if (pinCode) query['location.pinCode'] = pinCode;

    // NEW: Filter by station name (partial match)
    if (stationName && typeof stationName === 'string') {
      query['location.stationId'] = { $regex: new RegExp(stationName.trim(), 'i') };
    }

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate as string);
      if (toDate) query.date.$lte = new Date(toDate as string);
    }

    const pageNum = Math.max(parseInt(page as string, 10), 1);
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const sortObj: any = {};
    const [field, order] = (sort as string).split(':');
    sortObj[field || 'date'] = order === '1' ? 1 : -1;

    const [data, total] = await Promise.all([
      Groundwater.find(query)
        .select('location date waterLevelMbgl trend source')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean<IGroundwaterData[]>()
        .exec(),

      Groundwater.countDocuments(query),
    ]);

    const mlResult = env.isTest
      ? { predictions: [], summary: {} }
      : await sendDataToML(data);

    res.json({
      success: true,
      data,
      predictions: mlResult.predictions,
      summary: mlResult.summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
      message: data.length 
        ? 'Stations retrieved from JSON data' 
        : 'No stations found for the given filters (try different state/district or remove filters)',
    });
  } catch (err: any) {
    logger.error('Groundwater route error', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});

// GET /api/v1/pincodes/suggest (unchanged)
router.get('/pincodes/suggest', async (req, res) => {
  const { place, district } = req.query;

  if (!place || typeof place !== 'string') {
    return res.status(400).json({ success: false, error: 'Place name is required' });
  }

  try {
    const pincodes = await getAllPincodesForPlace(place, district as string | undefined);

    res.json({
      success: true,
      pincodes,
      message: pincodes.length ? `${pincodes.length} PIN code(s) found` : 'No PIN codes found',
    });
  } catch (err: any) {
    logger.error('PIN suggest error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to suggest PIN codes' });
  }
});

export default router;