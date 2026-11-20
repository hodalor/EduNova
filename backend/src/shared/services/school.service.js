let registry;

const resolveModels = (passed) => {
  if (passed) {
    registry = passed;
  }
  if (!registry) {
    registry = require('../../config/database').models;
  }
  return registry || {};
};

const schoolName = () => process.env.SCHOOL_NAME || 'EDUOVA';

const ensureSchool = async ({ transaction } = {}) => {
  const models = resolveModels();
  if (!models.Institution) {
    return {
      id: 'school',
      name: schoolName(),
      settings: {},
      is_active: true,
    };
  }

  const existing = await models.Institution.findOne({
    transaction,
    order: [['updated_at', 'DESC']],
  });
  if (existing) {
    return existing;
  }

  return models.Institution.create(
    {
      name: schoolName(),
      is_active: true,
      settings: {},
    },
    { transaction }
  );
};

const installSingleSchoolLookup = (models) => {
  const active = resolveModels(models);
  if (!active.Institution || active.Institution.findByPk.__singleSchool) {
    return;
  }

  const findSingleSchool = async (_id, options) => ensureSchool(options || {});
  findSingleSchool.__singleSchool = true;
  active.Institution.findByPk = findSingleSchool;
};

module.exports = {
  ensureSchool,
  installSingleSchoolLookup,
};
