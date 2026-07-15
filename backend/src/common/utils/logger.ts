import winston from 'winston';

/** Fields that must never appear in log output (HIPAA + security compliance). */
const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'refreshtoken',
  'tokenhash',
  'token_hash',
  'secret',
  'mfasecret',
  'mfa_secret',
  'apikey',
  'api_key',
  'ssn',
  'creditcard',
  'credit_card',
  'authorization',
];

/**
 * Recursively sanitizes an object, replacing sensitive field values with [REDACTED].
 */
function sanitize(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEYS.includes(key.toLowerCase());
    result[key] = isSensitive ? '[REDACTED]' : sanitize(value);
  }
  return result;
}

const isProduction = process.env.NODE_ENV === 'production';

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return JSON.stringify({ timestamp, level, message, ...(sanitize(meta) as object) });
  }),
);

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, correlationId, context, ...meta }) => {
    const ctxStr = context ? `[${String(context)}] ` : '';
    const corrStr = correlationId ? `(${String(correlationId)}) ` : '';
    const metaKeys = Object.keys(meta);
    const metaStr = metaKeys.length ? ` ${JSON.stringify(sanitize(meta))}` : '';
    return `${String(timestamp)} ${level}: ${ctxStr}${corrStr}${String(message)}${metaStr}`;
  }),
);

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? jsonFormat : devFormat,
  transports: [new winston.transports.Console()],
});
