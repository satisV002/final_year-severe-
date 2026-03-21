"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAsync = void 0;
/**
 * Wraps an asynchronous Express route handler to catch any errors and pass them to the next() middleware.
 * This prevents unhandled promise rejections from crashing the Node.js process.
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
exports.catchAsync = catchAsync;
//# sourceMappingURL=catchAsync.js.map