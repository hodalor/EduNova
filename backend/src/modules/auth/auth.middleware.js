const { models } = require('../../config/database');
const { hasPermission, hasPermissionInList } = require('../../shared/constants/permissions');
const { isTokenBlacklisted, verifyAccessToken } = require('../../shared/helpers/auth');
const {
  findPlatformUserById,
} = require('../../shared/services/platform-user.service');

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.replace('Bearer ', '').trim();
};

const authenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token is required.' });
  }
  if (await isTokenBlacklisted(token)) {
    return res.status(401).json({ success: false, message: 'Token has been revoked.' });
  }

  try {
    const payload = verifyAccessToken(token);
    let user = null;

    if (payload.role === 'super_admin') {
      user = await findPlatformUserById(payload.sub);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User account is inactive.' });
      }
    } else {
      user = await models.User.findByPk(payload.sub);
    }

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User account is inactive.' });
    }

    req.token = token;
    req.auth = payload;
    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const resolveInstitution = (req, _res, next) => {
  req.institutionId = null;
  return next();
};

const authorize = (roles = [], permission = null) => (req, res, next) => {
  if (req.user?.role === 'super_admin') {
    return next();
  }
  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient role privileges.' });
  }
  const effectivePermissions =
    Array.isArray(req.auth?.permissions) && req.auth.permissions.length
      ? req.auth.permissions
      : req.user?.permissions;
  if (
    permission &&
    !(
      (Array.isArray(effectivePermissions) && hasPermissionInList(effectivePermissions, permission)) ||
      hasPermission(req.user.role, permission)
    )
  ) {
    return res.status(403).json({ success: false, message: 'Permission denied.' });
  }
  return next();
};

const institutionGuard = (_req, _res, next) => next();

module.exports = {
  authenticate,
  resolveInstitution,
  authorize,
  institutionGuard,
};
