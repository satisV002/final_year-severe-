"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const envalid_1 = require("envalid");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({
    path: ".env",
});
const envVars = (0, envalid_1.cleanEnv)(process.env, {
    NODE_ENV: (0, envalid_1.str)({
        choices: ["development", "production", "test"],
    }),
    PORT: (0, envalid_1.num)({ default: 7000 }),
    MONGODB_URI: (0, envalid_1.str)(),
    REDIS_URL: (0, envalid_1.str)({
        default: "redis://localhost:6379",
    }),
    LOG_LEVEL: (0, envalid_1.str)({
        default: "info",
    }),
    RATE_LIMIT_WINDOW_MS: (0, envalid_1.num)({
        default: 900000,
    }),
    RATE_LIMIT_MAX: (0, envalid_1.num)({
        default: 100,
    }),
    JWT_SECRET: (0, envalid_1.str)(),
    JWT_EXPIRY: (0, envalid_1.str)({
        default: "1h",
    }),
    FRONTEND_URL: (0, envalid_1.str)({
        default: "http://localhost:3000",
    }),
});
exports.env = {
    ...envVars,
    isDev: envVars.NODE_ENV === "development",
    isProd: envVars.NODE_ENV === "production",
    isTest: envVars.NODE_ENV === "test",
};
//# sourceMappingURL=env.js.map