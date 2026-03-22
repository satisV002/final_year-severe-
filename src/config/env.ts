import { cleanEnv, str, num, url } from "envalid";
import dotenv from "dotenv";

dotenv.config({
  path: ".env",
});

const envVars = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development"
  }),

  PORT: num({ default: 7000 }),

  // Make these optional with defaults or more robust to prevent 502 on start
  MONGODB_URI: str({ 
    default: "mongodb://localhost:27017/groundwater_fallback" 
  }),

  REDIS_URL: str({
    default: "redis://localhost:6379",
  }),

  LOG_LEVEL: str({
    default: "info",
  }),

  RATE_LIMIT_WINDOW_MS: num({
    default: 900000,
  }),

  RATE_LIMIT_MAX: num({
    default: 100,
  }),

  JWT_SECRET: str({ 
    default: "fallback_secret_change_me_in_production_12345" 
  }),

  JWT_EXPIRY: str({
    default: "1h",
  }),
  
  FRONTEND_URL: str({
    default: "https://final-year-client-three.vercel.app",
  }),
});

export const env = {
  ...envVars,
  isDev: envVars.NODE_ENV === "development",
  isProd: envVars.NODE_ENV === "production",
  isTest: envVars.NODE_ENV === "test",
};