"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const hpp_1 = __importDefault(require("hpp"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const logger_1 = __importDefault(require("./utils/logger"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const loggerMiddleware_1 = require("./middleware/loggerMiddleware");
const groundwater_1 = __importDefault(require("./routes/groundwater"));
const auth_1 = __importDefault(require("./routes/auth"));
const liveData_1 = __importDefault(require("./routes/liveData"));
const mockData_1 = __importDefault(require("./routes/mockData"));
const proxy_1 = __importDefault(require("./routes/proxy"));
const createApp = () => {
    const app = (0, express_1.default)();
    // Security headers
    app.use((0, helmet_1.default)());
    // ─── CORS ───────────────────────────────────────────────────────────────────
    const ALLOWED_ORIGINS = [
        'https://final-year-client-three.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
    ];
    const corsOptions = {
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, Postman etc.)
            if (!origin)
                return callback(null, true);
            if (ALLOWED_ORIGINS.includes(origin))
                return callback(null, true);
            callback(new Error(`CORS: Origin not allowed → ${origin}`));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        optionsSuccessStatus: 204,
    };
    // Handle preflight for ALL routes (MUST be before routes)
    app.options('*', (0, cors_1.default)(corsOptions));
    app.use((0, cors_1.default)(corsOptions));
    // Manual header fallback (belt-and-suspenders)
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && ALLOWED_ORIGINS.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        next();
    });
    // ─────────────────────────────────────────────────────────────────────────────
    // Body parsing
    app.use(express_1.default.json({ limit: '10kb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
    // Security middlewares
    app.use((0, hpp_1.default)());
    // Rate limiting (global)
    app.use((0, express_rate_limit_1.default)({
        windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
        max: env_1.env.RATE_LIMIT_MAX,
        message: { success: false, error: 'Too many requests — try again later' },
        standardHeaders: true,
        legacyHeaders: false,
    }));
    // Compression
    app.use((0, compression_1.default)());
    // Logging
    if (env_1.env.isDev) {
        app.use((0, morgan_1.default)('dev'));
    }
    else {
        app.use((0, morgan_1.default)('combined', { stream: { write: (msg) => logger_1.default.http(msg.trim()) } }));
    }
    // Request logging
    app.use(loggerMiddleware_1.requestLogger);
    // Routes
    app.use('/api/v1/auth', auth_1.default); // Public: Signup/Login
    app.use('/api/v1', groundwater_1.default); // Groundwater endpoints
    app.use('/api/v1', liveData_1.default); // Live Data endpoints
    app.use('/api/v1', proxy_1.default); // Generic Proxy endpoint
    app.use('/api/v1/mock', mockData_1.default); // GUARANTEED MOCK DATA API 500+ Records
    // Health check
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            environment: env_1.env.NODE_ENV,
        });
    });
    // Test fast (no DB)
    app.get('/test-fast', (req, res) => {
        res.json({ message: 'This should be instant', time: new Date().toISOString() });
    });
    // 404 handler (must be after all routes)
    app.use(errorMiddleware_1.notFound);
    // Global error handler (must be last)
    app.use(errorMiddleware_1.errorHandler);
    return app;
};
exports.default = createApp;
//# sourceMappingURL=app.js.map