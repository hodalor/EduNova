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
  name: 'EDUOVA',
  is_active: true,
  settings: buildPlatformSettings(),
});

const serializePlatformInstitution = (institution) => {
  const base = institution?.toJSON ? institution.toJSON() : institution || {};
  const defaults = buildPlatformInstitutionPayload();

  return {
    ...defaults,
    ...base,
    education_levels: ['TR'],
    settings: buildPlatformSettings(base.settings),
  };
};

const platformUserDatabaseReady = () => Boolean(models.Institution && models.User);

const ensurePlatformInstitution = async ({ transaction } = {}) => {
  if (!platformUserDatabaseReady()) {
    return serializePlatformInstitution({ id: 'platform' });
  }

  const institution = await models.Institution.findOne({ transaction });

  if (institution) {
    return institution;
  }

  return models.Institution.create(
    {
      ...buildPlatformInstitutionPayload(),
      name: process.env.SCHOOL_NAME || 'EDUOVA',
    },
    { transaction }
  );
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
      role: 'super_admin',
      [Op.or]: [{ email: normalizedIdentity }, { phone: normalizedIdentity }],
    },
  });
};

const findPlatformUserById = async (id) => {
  if (!platformUserDatabaseReady()) {
    return null;
  }

  return models.User.findByPk(id);
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
