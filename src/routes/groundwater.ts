import express from 'express';
import { Groundwater } from '../models/Groundwater';
import { validateQueryParams } from '../middleware/validate';
import logger from '../utils/logger';
import { getAllPincodesForPlace } from '../services/pincodeService';
import { sendDataToML } from '../services/mlService';
import { env } from '../config/env';
import { IGroundwaterData } from '../types';
import { catchAsync } from '../utils/catchAsync';

const router = express.Router();

// GET /api/v1/groundwater
router.get('/groundwater', validateQueryParams, catchAsync(async (req, res) => {
  const {
    state,
    district,
    village,
    pinCode,
    stationName,
    fromDate,
    toDate,
    page = '1',
    limit = '20',
    sort = 'date:-1',
  } = req.query;

  const query: any = {};
  
  if (state && state !== 'All India') {
    query['location.state'] = { $regex: new RegExp(state as string, 'i') };
  }

  if (district) query['location.district'] = { $regex: new RegExp(district as string, 'i') };
  if (village) query['location.village'] = { $regex: new RegExp(village as string, 'i') };
  if (pinCode) query['location.pinCode'] = pinCode;

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
}));


// GET /api/v1/pincodes/suggest (unchanged)
router.get('/pincodes/suggest', catchAsync(async (req, res) => {
  const { place, district } = req.query;

  if (!place || typeof place !== 'string') {
    return res.status(400).json({ success: false, error: 'Place name is required' });
  }

  const pincodes = await getAllPincodesForPlace(place, district as string | undefined);

  res.json({
    success: true,
    pincodes,
    message: pincodes.length ? `${pincodes.length} PIN code(s) found` : 'No PIN codes found',
  });
}));


// POST /api/v1/sync
router.post('/sync', catchAsync(async (req, res) => {
  const { state, district, agencyName = 'CGWB', startdate, enddate } = req.body;

  if (!state || typeof state !== 'string' || state.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Valid state name is required'
    });
  }

  if (!district || typeof district !== 'string' || district.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Valid district name is required'
    });
  }

  const { fetchAndSaveGroundwaterData } = await import('../services/fetchGroundwater');
  
  logger.info(`Manual WRIS fetch triggered via /sync for state: ${state}, district: ${district}`);
  
  // Non-blocking fetch to avoid timeout on large datasets
  fetchAndSaveGroundwaterData(state.trim(), district.trim(), agencyName, startdate, enddate)
    .catch(err => logger.error('Async sync background fetch failed', err));

  res.json({
    success: true,
    message: `Synchronization started for ${state}/${district}. This may take a few minutes. Check logs for progress.`,
  });
}));


export default router;