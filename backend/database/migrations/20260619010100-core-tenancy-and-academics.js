'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await queryInterface.createTable("school_profile", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "logo_url": {
        type: Sequelize.TEXT,
      },
      "address": {
        type: Sequelize.TEXT,
      },
      "phone": {
        type: Sequelize.STRING,
      },
      "email": {
        type: Sequelize.STRING,
      },
      "website": {
        type: Sequelize.STRING,
      },
      "is_active": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      "settings": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    });
    await queryInterface.addIndex("school_profile", ["name"]);
    await queryInterface.createTable("institution_branches", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
            "branch_name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "address": {
        type: Sequelize.TEXT,
      },
      "is_main_branch": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("institution_branches", ["branch_name"], { unique: true });
    await queryInterface.createTable("academic_years", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
            "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "start_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "end_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "is_current": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("academic_years", ["name"], { unique: true });
    await queryInterface.createTable("terms_semesters", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
      "academic_year_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "academic_years",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "type": {
        type: Sequelize.ENUM("term", "semester"),
        allowNull: false,
      },
      "start_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "end_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "is_current": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("terms_semesters", ["academic_year_id", "name", "type"], { unique: true });
    await queryInterface.addIndex("terms_semesters", ["academic_year_id"]);
    await queryInterface.createTable("education_levels", {
      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },
            "level_code": {
        type: Sequelize.ENUM("TR"),
        allowNull: false,
      },
      "level_name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "age_min": {
        type: Sequelize.INTEGER,
      },
      "age_max": {
        type: Sequelize.INTEGER,
      },
    });
    await queryInterface.addIndex("education_levels", ["level_code"], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("education_levels");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_education_levels_level_code";');
    await queryInterface.dropTable("terms_semesters");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_terms_semesters_type";');
    await queryInterface.dropTable("academic_years");
    await queryInterface.dropTable("institution_branches");
    await queryInterface.dropTable("school_profile");
  },
};
