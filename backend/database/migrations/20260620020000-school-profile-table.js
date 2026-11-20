'use strict';

const tableNames = (tables) =>
  tables
    .map((table) => (typeof table === 'string' ? table : table.tableName || table.name || ''))
    .map((name) => String(name).replace(/"/g, '').split('.').pop());

module.exports = {
  async up(queryInterface) {
    const names = tableNames(await queryInterface.showAllTables());
    if (names.includes('institutions') && !names.includes('school_profile')) {
      await queryInterface.renameTable('institutions', 'school_profile');
    }
  },

  async down(queryInterface) {
    const names = tableNames(await queryInterface.showAllTables());
    if (names.includes('school_profile') && !names.includes('institutions')) {
      await queryInterface.renameTable('school_profile', 'institutions');
    }
  },
};
