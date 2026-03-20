"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQueryParams = void 0;
const errorMiddleware_1 = require("./errorMiddleware");
const validateQueryParams = (req, res, next) => {
    const { state, district, village, pinCode, fromDate, toDate } = req.query;
    // State is required
    if (!state || typeof state !== 'string' || state.trim().length < 2) {
        return next(new errorMiddleware_1.AppError('Valid state name is required', 400));
    }
    // Optional fields validation
    if (district && typeof district !== 'string') {
        return next(new errorMiddleware_1.AppError('District must be a string', 400));
    }
    if (village && typeof village !== 'string') {
        return next(new errorMiddleware_1.AppError('Village must be a string', 400));
    }
    if (pinCode && !/^\d{6}$/.test(pinCode)) {
        return next(new errorMiddleware_1.AppError('PIN code must be exactly 6 digits', 400));
    }
    // Date validation
    if (fromDate) {
        const from = new Date(fromDate);
        if (isNaN(from.getTime())) {
            return next(new errorMiddleware_1.AppError('Invalid fromDate format (use YYYY-MM-DD)', 400));
        }
    }
    if (toDate) {
        const to = new Date(toDate);
        if (isNaN(to.getTime())) {
            return next(new errorMiddleware_1.AppError('Invalid toDate format (use YYYY-MM-DD)', 400));
        }
    }
    next();
};
exports.validateQueryParams = validateQueryParams;
//# sourceMappingURL=validate.js.map