const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'];

export function getCorsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS;
  if (!configured) {
    return DEFAULT_CORS_ORIGINS;
  }
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
