import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');

function formatLogValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint' || typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'function') return value.name || '[function]';
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const formattedContext = formatLogValue(context);
    const contextStr = formattedContext ? `[${formattedContext}]` : '';
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${formatLogValue(timestamp)} ${formatLogValue(level)} ${contextStr} ${formatLogValue(message)} ${metaStr}`;
  }),
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Daily rotate transport for all logs
const dailyRotateTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

// Daily rotate transport for errors only
const errorRotateTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: fileFormat,
});

export const winstonConfig = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transports
    dailyRotateTransport,
    errorRotateTransport,
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});
