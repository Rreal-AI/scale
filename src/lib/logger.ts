import winston from "winston";

const logLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger = winston.createLogger({
  level: logLevel,
  transports: [new winston.transports.Console()],
  format:
    process.env.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
});
