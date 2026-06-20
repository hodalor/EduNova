'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_institutions_education_levels'
        ) THEN
          CREATE TYPE "enum_institutions_education_levels" AS ENUM ('DC', 'PR', 'JH', 'SH', 'TR');
        END IF;
      END $$;
    `);
    await queryInterface.createTable("institutions", {
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
      "code": {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      "education_levels": {
        type: 'enum_institutions_education_levels[]',
        allowNull: false,
        defaultValue: Sequelize.literal("'{}'::\"enum_institutions_education_levels\"[]"),
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
      "subscription_plan": {
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
    await queryInterface.addIndex("institutions", ["code"], { unique: true });
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
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
    await queryInterface.addIndex("institution_branches", ["institution_id", "branch_name"], { unique: true });
    await queryInterface.addIndex("institution_branches", ["institution_id"]);
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
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
    await queryInterface.addIndex("academic_years", ["institution_id", "name"], { unique: true });
    await queryInterface.addIndex("academic_years", ["institution_id"]);
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
      "institution_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "institutions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "level_code": {
        type: Sequelize.ENUM("DC", "PR", "JH", "SH", "TR"),
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
    await queryInterface.addIndex("education_levels", ["institution_id", "level_code"], { unique: true });
    await queryInterface.addIndex("education_levels", ["institution_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("education_levels");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_education_levels_level_code";');
    await queryInterface.dropTable("terms_semesters");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_terms_semesters_type";');
    await queryInterface.dropTable("academic_years");
    await queryInterface.dropTable("institution_branches");
    await queryInterface.dropTable("institutions");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_institutions_education_levels";');
  },
};
