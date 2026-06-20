'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_notifications_target_roles'
        ) THEN
          CREATE TYPE "enum_notifications_target_roles" AS ENUM (
            'super_admin', 'institution_admin', 'teacher', 'student',
            'parent', 'driver', 'accountant', 'librarian'
          );
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_notifications_channels'
        ) THEN
          CREATE TYPE "enum_notifications_channels" AS ENUM ('sms', 'email', 'push', 'whatsapp');
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_announcements_target_levels'
        ) THEN
          CREATE TYPE "enum_announcements_target_levels" AS ENUM ('DC', 'PR', 'JH', 'SH', 'TR');
        END IF;
      END $$;
    `);
    await queryInterface.createTable("notifications", {
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
      "sender_id": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "title": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "body": {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      "type": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "target_roles": {
        type: 'enum_notifications_target_roles[]',
        allowNull: false,
        defaultValue: Sequelize.literal("'{}'::\"enum_notifications_target_roles\"[]"),
      },
      "target_ids": {
        type: Sequelize.ARRAY(Sequelize.UUID),
      },
      "channels": {
        type: 'enum_notifications_channels[]',
        allowNull: false,
        defaultValue: Sequelize.literal("'{}'::\"enum_notifications_channels\"[]"),
      },
      "scheduled_at": {
        type: Sequelize.DATE,
      },
      "sent_at": {
        type: Sequelize.DATE,
      },
      "status": {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "draft",
      },
    });
    await queryInterface.addIndex("notifications", ["institution_id"]);
    await queryInterface.addIndex("notifications", ["sender_id"]);
    await queryInterface.createTable("messages", {
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
      "sender_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "recipient_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "thread_id": {
        type: Sequelize.UUID,
      },
      "content": {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      "attachments": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      "read_at": {
        type: Sequelize.DATE,
      },
      "is_deleted_by_sender": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      "is_deleted_by_recipient": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("messages", ["thread_id"]);
    await queryInterface.addIndex("messages", ["institution_id"]);
    await queryInterface.addIndex("messages", ["sender_id"]);
    await queryInterface.addIndex("messages", ["recipient_id"]);
    await queryInterface.createTable("announcements", {
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
      "created_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "title": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "content": {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      "attachments": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      "target_levels": {
        type: 'enum_announcements_target_levels[]',
        allowNull: false,
        defaultValue: Sequelize.literal("'{}'::\"enum_announcements_target_levels\"[]"),
      },
      "target_classes": {
        type: Sequelize.ARRAY(Sequelize.UUID),
        allowNull: false,
        defaultValue: Sequelize.literal("'{}'::uuid[]"),
      },
      "publish_at": {
        type: Sequelize.DATE,
      },
      "expire_at": {
        type: Sequelize.DATE,
      },
      "is_published": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("announcements", ["institution_id"]);
    await queryInterface.addIndex("announcements", ["created_by"]);
    await queryInterface.createTable("discipline_incidents", {
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
      "student_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "reported_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "incident_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "category": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "severity": {
        type: Sequelize.ENUM("minor", "moderate", "major"),
        allowNull: false,
      },
      "description": {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      "action_taken": {
        type: Sequelize.TEXT,
      },
      "parent_notified": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      "counseling_required": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      "follow_up_date": {
        type: Sequelize.DATEONLY,
      },
      "status": {
        type: Sequelize.ENUM("open", "resolved"),
        allowNull: false,
        defaultValue: "open",
      },
    });
    await queryInterface.addIndex("discipline_incidents", ["institution_id"]);
    await queryInterface.addIndex("discipline_incidents", ["student_id"]);
    await queryInterface.addIndex("discipline_incidents", ["reported_by"]);
    await queryInterface.createTable("demerit_points", {
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
      "student_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "incident_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "discipline_incidents",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "points": {
        type: Sequelize.INTEGER,
        allowNull: false,
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
    });
    await queryInterface.addIndex("demerit_points", ["student_id"]);
    await queryInterface.addIndex("demerit_points", ["incident_id"]);
    await queryInterface.addIndex("demerit_points", ["academic_year_id"]);
    await queryInterface.createTable("merit_points", {
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
      "student_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "reason": {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      "points": {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      "awarded_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    });
    await queryInterface.addIndex("merit_points", ["student_id"]);
    await queryInterface.addIndex("merit_points", ["awarded_by"]);
    await queryInterface.addIndex("merit_points", ["academic_year_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("merit_points");
    await queryInterface.dropTable("demerit_points");
    await queryInterface.dropTable("discipline_incidents");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_discipline_incidents_severity";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_discipline_incidents_status";');
    await queryInterface.dropTable("announcements");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_announcements_target_levels";');
    await queryInterface.dropTable("messages");
    await queryInterface.dropTable("notifications");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_target_roles";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_channels";');
  },
};
