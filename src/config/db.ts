// src/config/db.ts
import mongoose from 'mongoose';
import { env } from './env';          // ← FIXED: import from './env' (not 'process')
import logger from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    // 1. Fix: env.isProd is boolean, but make it explicit & safe
    mongoose.set('autoIndex', env.isProd === true);  // or !!env.isProd

    // 2. Better debug logging in dev (with timing approximation)
    if (env.isDev) {
      mongoose.set('debug', (collectionName: string, method: string, query: any, doc: any) => {
        const start = Date.now();
        logger.debug(`Mongoose: ${collectionName}.${method}()`, { query, doc });

        // Approximate completion time (async nature)
        setImmediate(() => {
          logger.debug(
            `Mongoose: ${collectionName}.${method} completed in ~${Date.now() - start}ms`
          );
        });
      });
    }

    // 3. Fix: env.MONGODB_URI is required → safe to use ! (non-null assertion)
    //    If you prefer runtime check → add if (!env.MONGODB_URI) throw new Error(...)
    const conn = await mongoose.connect(env.MONGODB_URI!, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
    });

    logger.info(
      `MongoDB Atlas connected → ${conn.connection.host} (state: ${conn.connection.readyState})`
    );

    // Connection events
    mongoose.connection.on('connected', () =>
      logger.info('MongoDB → connected event fired')
    );
    mongoose.connection.on('open', () =>
      logger.info('MongoDB → open event fired')
    );
    mongoose.connection.on('error', (err) =>
      logger.error('MongoDB connection error', { error: err.message, stack: err.stack })
    );
    mongoose.connection.on('disconnected', () =>
      logger.warn('MongoDB disconnected - auto-reconnect will try')
    );
  } catch (error: any) {
    console.error('CRITICAL MONGO CRASH:', error);
    logger.error('MongoDB connection failed', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });
    process.exit(1);
  }
};