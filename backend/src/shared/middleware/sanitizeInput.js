const stripTags = (value) => value.replace(/<[^>]*>/g, '').trim();

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return stripTags(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, sanitizeValue(child)])
    );
  }

  return value;
};

const sanitizeInput = (req, _res, next) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  next();
};

module.exports = sanitizeInput;
