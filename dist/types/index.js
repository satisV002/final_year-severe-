"use strict";
// src/types/index.ts
// Shared types for backend + frontend
// Centralized Mongoose schema & indexes (NO duplicates)
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroundwaterSchema = exports.GroundwaterSchemaDefinition = void 0;
const mongoose_1 = require("mongoose");
/* ─────────────────────────────────────────────
   Mongoose Schema Definition
   (NO index: true at field level)
───────────────────────────────────────────── */
exports.GroundwaterSchemaDefinition = {
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
                    validator: (v) => v.length === 2,
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
};
/* ─────────────────────────────────────────────
   Shared Schema Instance
───────────────────────────────────────────── */
exports.GroundwaterSchema = new mongoose_1.Schema(exports.GroundwaterSchemaDefinition, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            ret.id = ret._id.toString();
            delete ret._id;
        },
    },
    toObject: { virtuals: true },
});
/* ─────────────────────────────────────────────
   INDEXES (ONLY HERE)
───────────────────────────────────────────── */
exports.GroundwaterSchema.index({ 'location.state': 1, date: -1 });
exports.GroundwaterSchema.index({
    'location.district': 1,
    'location.village': 1,
    date: -1,
});
exports.GroundwaterSchema.index({
    'location.coordinates': '2dsphere',
});
// Prevent duplicate records
exports.GroundwaterSchema.index({
    'location.state': 1,
    'location.district': 1,
    'location.village': 1,
    'location.pinCode': 1,
    date: 1,
}, { unique: true, sparse: true });
//# sourceMappingURL=index.js.map