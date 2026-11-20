'use strict';

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const [schools] = await sequelize.query(`
      SELECT id
        FROM school_profile
       WHERE deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 1
    `);
    const schoolId = schools[0] && schools[0].id;
    if (!schoolId || !/^[0-9a-f-]{36}$/i.test(String(schoolId))) {
      return;
    }

    const [columns] = await sequelize.query(`
      SELECT table_name
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND column_name = 'institution_id'
       ORDER BY table_name
    `);

    for (const column of columns) {
      await sequelize.query(
        `ALTER TABLE "${column.table_name}" ALTER COLUMN institution_id SET DEFAULT '${schoolId}'::uuid`
      );
    }
  },

  async down(queryInterface) {
    const [columns] = await queryInterface.sequelize.query(`
      SELECT table_name
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND column_name = 'institution_id'
       ORDER BY table_name
    `);

    for (const column of columns) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "${column.table_name}" ALTER COLUMN institution_id DROP DEFAULT`
      );
    }
  },
};
