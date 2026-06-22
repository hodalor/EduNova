const { Op } = require('sequelize');

const { models } = require('../../config/database');
const { getClusterMetadata } = require('./tenant-cluster.service');

const PLATFORM_LEVELS = ['DC', 'PR', 'JH', 'SH', 'TR'];
const PLATFORM_CODE = 'MASTER';

const buildPlatformSettings = (settings = {}) => ({
  ...(settings || {}),
  platform: {
    ...(settings?.platform || {}),
    god_mode: true,
    cluster: getClusterMetadata(),
  },
});

const buildPlatformInstitutionPayload = () => ({
  name: 'EDUOVA Master Control',
  code: PLATFORM_CODE,
  subscription_plan: 'enterprise',
  education_levels: PLATFORM_LEVELS,
  is_active: true,
  settings: buildPlatformSettings(),
});

const serializePlatformInstitution = (institution) => {
  const base = institution?.toJSON ? institution.toJSON() : institution || {};
  const defaults = buildPlatformInstitutionPayload();

  return {
    ...defaults,
    ...base,
    code: PLATFORM_CODE,
    education_levels: base.education_levels?.length ? base.education_levels : defaults.education_levels,
    settings: buildPlatformSettings(base.settings),
  };
};

const platformUserDatabaseReady = () => Boolean(models.Institution && models.User);

const ensurePlatformInstitution = async ({ transaction } = {}) => {
  if (!platformUserDatabaseReady()) {
    return serializePlatformInstitution({ id: 'platform' });
  }

  const institution = await models.Institution.findOne({
    where: { code: PLATFORM_CODE },
    transaction,
  });

  if (institution) {
    return institution;
  }

  return models.Institution.create(buildPlatformInstitutionPayload(), { transaction });
};

const normalizePlatformIdentity = (value) => String(value || '').trim().toLowerCase();

const resolvePlatformUsername = (user) => {
  const base = user?.toJSON ? user.toJSON() : user || {};
  return String(base.phone || base.username || base.email || '')
    .trim()
    .toLowerCase();
};

const findPlatformUserByIdentity = async (identity) => {
  if (!platformUserDatabaseReady()) {
    return null;
  }

  const platformInstitution = await ensurePlatformInstitution();
  const normalizedIdentity = normalizePlatformIdentity(identity);

  return models.User.findOne({
    where: {
      institution_id: platformInstitution.id,
      role: 'super_admin',
      [Op.or]: [{ email: normalizedIdentity }, { phone: normalizedIdentity }],
    },
    include: [{ model: models.Institution, as: 'institution' }],
  });
};

const findPlatformUserById = async (id) => {
  if (!platformUserDatabaseReady()) {
    return null;
  }

  return models.User.findByPk(id, {
    include: [{ model: models.Institution, as: 'institution' }],
  });
};

module.exports = {
  PLATFORM_CODE,
  PLATFORM_LEVELS,
  buildPlatformSettings,
  serializePlatformInstitution,
  platformUserDatabaseReady,
  ensurePlatformInstitution,
  normalizePlatformIdentity,
  resolvePlatformUsername,
  findPlatformUserByIdentity,
  findPlatformUserById,
};
