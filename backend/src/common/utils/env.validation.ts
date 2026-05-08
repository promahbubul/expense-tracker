type EnvMap = Record<string, unknown>;

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'] as const;
const GOOGLE_KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_REDIRECT_URI'] as const;

export function validateEnvironment(config: EnvMap) {
  requireTrimmed(config, 'MONGODB_URI');
  requireTrimmed(config, 'JWT_SECRET');

  if (normalized(config.NODE_ENV) === 'production') {
    requireTrimmed(config, 'CORS_ORIGIN');
  }

  ensureCompleteGroup(config, SMTP_KEYS, 'SMTP');
  ensureCompleteGroup(config, GOOGLE_KEYS, 'Google OAuth');

  if (hasValue(config, SMTP_KEYS) && !normalized(config.APP_PUBLIC_WEB_URL)) {
    throw new Error('APP_PUBLIC_WEB_URL is required when SMTP is configured');
  }

  return config;
}

export function parseEnvList(value?: string) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureCompleteGroup(config: EnvMap, keys: readonly string[], label: string) {
  const present = keys.filter((key) => normalized(config[key]));
  if (present.length && present.length !== keys.length) {
    const missing = keys.filter((key) => !normalized(config[key]));
    throw new Error(`${label} configuration is incomplete. Missing: ${missing.join(', ')}`);
  }
}

function hasValue(config: EnvMap, keys: readonly string[]) {
  return keys.some((key) => normalized(config[key]));
}

function requireTrimmed(config: EnvMap, key: string) {
  if (!normalized(config[key])) {
    throw new Error(`${key} is required`);
  }
}

function normalized(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
