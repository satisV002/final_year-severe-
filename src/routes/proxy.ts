import { Router } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

const router = Router();

/**
 * GENERIC PROXY ENDPOINT
 * GET /api/v1/proxy?url=...
 * 
 * Allows frontend to fetch external resources via backend to avoid CORS
 * and provide a centralized point for rate-limiting/logging.
 */
router.all('/proxy', async (req, res) => {
    const targetUrl = (req.query.url as string) || (req.body.url as string);

    if (!targetUrl) {
        return res.status(400).json({ success: false, error: 'Target URL is required' });
    }

    try {
        logger.info(`Proxying ${req.method} request to: ${targetUrl}`);

        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.method !== 'GET' ? req.body : undefined,
            params: req.method === 'GET' ? { ...req.query, url: undefined } : undefined,
            timeout: 10000,
            headers: {
                'User-Agent': 'AquaWatch-Backend-Proxy/1.0',
            },
        });

        res.status(response.status).json(response.data);
    } catch (error: any) {
        logger.error('Proxy request failed', {
            url: targetUrl,
            status: error.response?.status,
            message: error.message
        });

        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Proxy request failed',
            details: error.message
        });
    }
});

export default router;
