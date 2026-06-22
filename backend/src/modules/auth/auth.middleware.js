const { models } = require('../../config/database');
const { hasPermission } = require('../../shared/constants/permissions');
const { isTokenBlacklisted, verifyAccessToken } = require('../../shared/helpers/auth');
const { store } = require('../../shared/store/runtime-store');

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.replace('Bearer ', '').trim();
};

const findRuntimeSuperAdmin = (userId) =>
  [store.platform.superAdmin, ...(store.platform.superAdmins || [])].find(
    (item) => item.id === userId
  ) || null;

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
      const runtimeSuperAdmin = findRuntimeSuperAdmin(payload.sub);
      if (!runtimeSuperAdmin) {
        return res.status(401).json({ success: false, message: 'User account is inactive.' });
      }

      user = {
        ...runtimeSuperAdmin,
        institution: {
          id: 'platform',
          name: 'EDUOVA Master Control',
          code: 'MASTER',
          education_levels: ['DC', 'PR', 'JH', 'SH', 'TR'],
          settings: {
            platform: {
              god_mode: true,
              cluster: store.platform.cluster,
            },
          },
        },
      };
    } else {
      user = await models.User.findByPk(payload.sub, {
        include: [{ model: models.Institution, as: 'institution' }],
      });
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

const resolveInstitution = (req, res, next) => {
  const headerInstitution = req.headers['x-institution-id'];
  const institutionId = req.auth?.institution_id || headerInstitution || req.body.institution_id || req.query.institution_id;

  if (!institutionId) {
    return res.status(400).json({ success: false, message: 'institution_id is required.' });
  }
  if (req.user?.institution_id && req.user.role !== 'super_admin' && req.user.institution_id !== institutionId) {
    return res.status(403).json({ success: false, message: 'Institution mismatch.' });
  }

  req.institutionId = institutionId;
  return next();
};

const authorize = (roles = [], permission = null) => (req, res, next) => {
  if (req.user?.role === 'super_admin') {
    return next();
  }
  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient role privileges.' });
  }
  if (permission && !hasPermission(req.user.role, permission)) {
    return res.status(403).json({ success: false, message: 'Permission denied.' });
  }
  return next();
};

const institutionGuard = (req, res, next) => {
  if (!req.institutionId) {
    return res.status(400).json({ success: false, message: 'Institution must be resolved first.' });
  }
  return next();
};

module.exports = {
  authenticate,
  resolveInstitution,
  authorize,
  institutionGuard,
};
