"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Groundwater_1 = require("../models/Groundwater");
const validate_1 = require("../middleware/validate");
const logger_1 = __importDefault(require("../utils/logger"));
const pincodeService_1 = require("../services/pincodeService");
const mlService_1 = require("../services/mlService");
const env_1 = require("../config/env");
const router = express_1.default.Router();
// GET /api/v1/groundwater
router.get('/groundwater', validate_1.validateQueryParams, async (req, res) => {
    try {
        const { state, district, village, pinCode, stationName, // ← NEW: optional filter by station name
        fromDate, toDate, page = '1', limit = '20', sort = 'date:-1', } = req.query;
        const query = {};
        if (state && state !== 'All India') {
            query['location.state'] = { $regex: new RegExp(state, 'i') };
        }
        if (district)
            query['location.district'] = { $regex: new RegExp(district, 'i') };
        if (village)
            query['location.village'] = { $regex: new RegExp(village, 'i') };
        if (pinCode)
            query['location.pinCode'] = pinCode;
        // NEW: Filter by station name (partial match)
        if (stationName && typeof stationName === 'string') {
            query['location.stationId'] = { $regex: new RegExp(stationName.trim(), 'i') };
        }
        if (fromDate || toDate) {
            query.date = {};
            if (fromDate)
                query.date.$gte = new Date(fromDate);
            if (toDate)
                query.date.$lte = new Date(toDate);
        }
        const pageNum = Math.max(parseInt(page, 10), 1);
        const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
        const skip = (pageNum - 1) * limitNum;
        const sortObj = {};
        const [field, order] = sort.split(':');
        sortObj[field || 'date'] = order === '1' ? 1 : -1;
        const [data, total] = await Promise.all([
            Groundwater_1.Groundwater.find(query)
                .select('location date waterLevelMbgl trend source')
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum)
                .lean()
                .exec(),
            Groundwater_1.Groundwater.countDocuments(query),
        ]);
        const mlResult = env_1.env.isTest
            ? { predictions: [], summary: {} }
            : await (0, mlService_1.sendDataToML)(data);
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
    }
    catch (err) {
        logger_1.default.error('Groundwater route error', { error: err.message, stack: err.stack });
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
        const pincodes = await (0, pincodeService_1.getAllPincodesForPlace)(place, district);
        res.json({
            success: true,
            pincodes,
            message: pincodes.length ? `${pincodes.length} PIN code(s) found` : 'No PIN codes found',
        });
    }
    catch (err) {
        logger_1.default.error('PIN suggest error', { error: err.message });
        res.status(500).json({ success: false, error: 'Failed to suggest PIN codes' });
    }
});
// POST /api/v1/sync
router.post('/sync', async (req, res) => {
    try {
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
        const { fetchAndSaveGroundwaterData } = await Promise.resolve().then(() => __importStar(require('../services/fetchGroundwater')));
        logger_1.default.info(`Manual WRIS fetch triggered via /sync for state: ${state}, district: ${district}`);
        // Non-blocking fetch to avoid timeout on large datasets
        fetchAndSaveGroundwaterData(state.trim(), district.trim(), agencyName, startdate, enddate)
            .catch(err => logger_1.default.error('Async sync background fetch failed', err));
        res.json({
            success: true,
            message: `Synchronization started for ${state}/${district}. This may take a few minutes. Check logs for progress.`,
        });
    }
    catch (err) {
        logger_1.default.error('Sync route error', { error: err.message });
        res.status(500).json({ success: false, error: 'Failed to initialize synchronization' });
    }
});
exports.default = router;
//# sourceMappingURL=groundwater.js.map