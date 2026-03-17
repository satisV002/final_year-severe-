// src/services/mlService.ts
import logger from '../utils/logger';
import { IGroundwaterData } from '../types'; // ← use plain interface
import { env } from '../config/env';

type MLResponse = {
  predictions: Array<{
    date: string | Date;
    predictedMbgl: number;
    confidence: number;
  }>;
  summary: {
    trend: string;
    riskLevel: string;
  };
};

export async function sendDataToML(
  data: IGroundwaterData[]  // ← changed to plain interface
): Promise<MLResponse> {
  if (env.isTest) {
    return {
      predictions: [],
      summary: {
        trend: 'N/A',
        riskLevel: 'N/A',
      },
    };
  }

  logger.info(`Sending ${data.length} records to ML model`);

  const mlInput = data.map(item => ({
    date: item.date instanceof Date ? item.date.toISOString() : item.date,
    waterLevelMbgl: item.waterLevelMbgl,
    location:
      item.location.village ||
      item.location.district ||
      item.location.state ||
      'Unknown',
  }));

  try {
    // Your mock logic (replace with real ML call later)
    const predictions = mlInput.map(item => ({
      date: item.date,
      predictedMbgl: Number((item.waterLevelMbgl * 0.95).toFixed(2)),
      confidence: 75,
    }));

    return {
      predictions,
      summary: {
        trend: data.length > 1 ? 'Stable' : 'N/A',
        riskLevel: 'Semi-Critical',
      },
    };
  } catch (err: any) {
    logger.error('ML processing failed', { error: err.message });
    throw new Error('ML prediction failed');
  }
}