import { cleanEnv, str, num, url } from "envalid";
import dotenv from "dotenv";

dotenv.config({
  path: ".env",
});

const envVars = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production", "test"],
  }),

  PORT: num({ default: 7000 }),

  MONGODB_URI: str(),

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

  JWT_SECRET: str(),

  JWT_EXPIRY: str({
    default: "1h",
  }),
  
  FRONTEND_URL: str({
    default: "http://localhost:3000",
  }),
});

export const env = {
  ...envVars,
  isDev: envVars.NODE_ENV === "development",
  isProd: envVars.NODE_ENV === "production",
  isTest: envVars.NODE_ENV === "test",
};