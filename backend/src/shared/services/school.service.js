const { models } = require('../../config/database');

const schoolName = () => process.env.SCHOOL_NAME || 'EDUOVA';

const ensureSchool = async ({ transaction } = {}) => {
  if (!models.Institution) {
    return {
      id: 'school',
      name: schoolName(),
      settings: {},
      is_active: true,
    };
  }

  const existing = await models.Institution.findOne({ transaction });
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

const installSingleSchoolLookup = () => {
  if (!models.Institution || models.Institution.findByPk.__singleSchool) {
    return;
  }

  const findSingleSchool = async (_id, options) => ensureSchool(options || {});
  findSingleSchool.__singleSchool = true;
  models.Institution.findByPk = findSingleSchool;
};

module.exports = {
  ensureSchool,
  installSingleSchoolLookup,
};
