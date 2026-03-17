// src/types/index.ts
// Shared types for backend + frontend
// Centralized Mongoose schema & indexes (NO duplicates)

import { Schema, Document } from 'mongoose';

/* ─────────────────────────────────────────────
   Location Structure
───────────────────────────────────────────── */
export interface ILocation {
  state: string;
  district?: string;
  block?: string;
  village?: string;
  pinCode?: string;
  stationId?: string;
  stationName?: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

/* ─────────────────────────────────────────────
   Groundwater Core Data
───────────────────────────────────────────── */
export interface IGroundwaterData {
  _id?: string;
  location: ILocation;
  date: Date | string;
  waterLevelMbgl: number;
  availabilityBcm?: number;
  trend?: 'Rising' | 'Falling' | 'Stable' | null;
  source: 'WRIS' | 'CGWB' | 'StatePortal' | 'Manual' | 'Other';
  quality?: Record<string, number>;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ─────────────────────────────────────────────
   Query Filters
───────────────────────────────────────────── */
export interface IGroundwaterFilter {
  state?: string;
  district?: string;
  block?: string;
  village?: string;
  pinCode?: string;
  stationId?: string;
  fromDate?: string;
  toDate?: string;
  pastDays?: number;
  futureDays?: number;
  limit?: number;
  page?: number;
  sort?: string;
}

/* ─────────────────────────────────────────────
   Prediction Types (ML)
───────────────────────────────────────────── */
export interface IPredictionPoint {
  date: Date | string;
  predictedMbgl: number;
  lowerBound?: number;
  upperBound?: number;
  confidence?: number;
  note?: string;
}

export interface IPredictionResult {
  points: IPredictionPoint[];
  summary: {
    currentAvgMbgl: number;
    predictedAvgMbgl: number;
    trend: 'Improving' | 'Declining' | 'Stable' | 'Uncertain';
    riskLevel: 'Safe' | 'Semi-Critical' | 'Critical' | 'Over-Exploited';
  };
}

/* ─────────────────────────────────────────────
   API Response Shape
───────────────────────────────────────────── */
export interface GroundwaterApiResponse {
  success: boolean;
  data: IGroundwaterData[];
  predictions?: IPredictionResult;
  summary?: {
    averageMbgl: number;
    minMbgl: number;
    maxMbgl: number;
    status: 'Safe' | 'Semi-Critical' | 'Critical' | 'Over-Exploited';
    totalRecords: number;
  };
  error?: string;
}

/* ─────────────────────────────────────────────
   Mongoose Schema Definition
   (NO index: true at field level)
───────────────────────────────────────────── */
export const GroundwaterSchemaDefinition = {
  location: {
    state: { type: String, required: true, trim: true },
    district: { type: String, trim: true, sparse: true },
    block: { type: String, trim: true, sparse: true },
    village: { type: String, trim: true, sparse: true },
    pinCode: { type: String, trim: true, sparse: true },
    stationId: { type: String, sparse: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (v: number[]) => v.length === 2,
          message: 'Coordinates must be [lng, lat]',
        },
      },
    },
  },
  date: { type: Date, required: true },
  waterLevelMbgl: { type: Number, required: true },
  availabilityBcm: { type: Number, sparse: true },
  trend: {
    type: String,
    enum: ['Rising', 'Falling', 'Stable'],
    sparse: true,
  },
  source: {
    type: String,
    required: true,
    enum: ['WRIS', 'CGWB', 'StatePortal', 'Manual', 'Other'],
  },
  quality: {
    type: Map,
    of: Number,
    sparse: true,
  },
} as const;

/* ─────────────────────────────────────────────
   Shared Schema Instance
───────────────────────────────────────────── */
export const GroundwaterSchema = new Schema(GroundwaterSchemaDefinition, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc, ret: any) {
      ret.id = ret._id.toString();
      delete ret._id;
    },
  },
  toObject: { virtuals: true },
});

/* ─────────────────────────────────────────────
   INDEXES (ONLY HERE)
───────────────────────────────────────────── */
GroundwaterSchema.index({ 'location.state': 1, date: -1 });

GroundwaterSchema.index({
  'location.district': 1,
  'location.village': 1,
  date: -1,
});

GroundwaterSchema.index({
  'location.coordinates': '2dsphere',
});

// Prevent duplicate records
GroundwaterSchema.index(
  {
    'location.state': 1,
    'location.district': 1,
    'location.village': 1,
    'location.pinCode': 1,
    date: 1,
  },
  { unique: true, sparse: true }
);

/* ─────────────────────────────────────────────
   User Types (Authentication)
───────────────────────────────────────────── */
export interface IUser {
  _id: string;
  fullname: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserDocument = IUser & Document;

/* ─────────────────────────────────────────────
   Auth Response
───────────────────────────────────────────── */
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    fullname: string;
    email: string;
  };
  message?: string;
  error?: string;
}
