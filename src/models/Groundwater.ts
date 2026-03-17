import mongoose, { Schema, Document, Model } from 'mongoose';
import { GroundwaterSchemaDefinition } from '../types';

export interface IGroundwater extends Document {
  location: {
    state: string;
    district?: string;
    block?: string;
    village?: string;
    pinCode?: string;
    stationId?: string;
    coordinates?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  date: Date;
  waterLevelMbgl: number;
  availabilityBcm?: number;
  trend?: 'Rising' | 'Falling' | 'Stable' | null;
  source: string;
  quality?: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const GroundwaterSchemaInstance = new Schema<IGroundwater>(
  GroundwaterSchemaDefinition,
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  }
);

// ---------------- INDEXES ----------------

// Unique per station per date
GroundwaterSchemaInstance.index(
  { 'location.stationId': 1, date: 1 },
  { unique: true }
);

// Geo index
GroundwaterSchemaInstance.index({
  'location.coordinates': '2dsphere'
});

// Date index
GroundwaterSchemaInstance.index({ date: -1 });

// ---------------- PRE SAVE ----------------

GroundwaterSchemaInstance.pre<IGroundwater>('save', function () {
  if (this.location?.state) this.location.state = this.location.state.trim();
  if (this.location?.district) this.location.district = this.location.district.trim();
  if (this.location?.block) this.location.block = this.location.block.trim();
  if (this.location?.village) this.location.village = this.location.village.trim();
  if (this.location?.pinCode) this.location.pinCode = this.location.pinCode.trim();
});

export const Groundwater: Model<IGroundwater> =
  mongoose.models.Groundwater ||
  mongoose.model<IGroundwater>('Groundwater', GroundwaterSchemaInstance);