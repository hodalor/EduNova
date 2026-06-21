const crypto = require('crypto');

const withCacheHeaders =
  ({ maxAge = 300, immutable = false } = {}) =>
  (_req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      const serialized = JSON.stringify(payload);
      const etag = crypto.createHash('sha1').update(serialized).digest('hex');

      res.setHeader(
        'Cache-Control',
        `${immutable ? 'public' : 'private'}, max-age=${maxAge}${immutable ? ', immutable' : ''}`
      );
      res.setHeader('ETag', `"${etag}"`);

      if (_req.headers['if-none-match'] === `"${etag}"`) {
        return res.status(304).end();
      }

      return originalJson(payload);
    };

    next();
  };

module.exports = {
  withCacheHeaders,
};
