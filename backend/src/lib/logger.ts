import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level:
    env.NODE_ENV === "test"
      ? "silent"
      : env.NODE_ENV === "development"
        ? "debug"
        : "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss Z",
          },
        }
      : undefined,
});
