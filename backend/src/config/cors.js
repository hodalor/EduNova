const parseOriginList = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const configuredOrigins = () => {
  const env = require('./env');
  return Array.from(
    new Set([...parseOriginList(env.FRONTEND_URL), ...parseOriginList(env.CORS_ORIGINS)])
  );
};

const isLoopbackOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      (hostname === 'localhost' || hostname === '127.0.0.1')
    );
  } catch (_error) {
    return false;
  }
};

const isNetlifyOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'https:' && (hostname === 'netlify.app' || hostname.endsWith('.netlify.app'));
  } catch (_error) {
    return false;
  }
};

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return configuredOrigins().includes(origin) || isLoopbackOrigin(origin) || isNetlifyOrigin(origin);
};

module.exports = {
  configuredOrigins,
  isAllowedOrigin,
};
