'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
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
      "email": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "phone": {
        type: Sequelize.STRING,
      },
      "password_hash": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "role": {
        type: Sequelize.ENUM("super_admin", "institution_admin", "teacher", "student", "parent", "driver", "accountant", "librarian"),
        allowNull: false,
      },
      "first_name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "last_name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "profile_photo": {
        type: Sequelize.TEXT,
      },
      "is_active": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      "last_login": {
        type: Sequelize.DATE,
      },
      "email_verified": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      "phone_verified": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      "2fa_enabled": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      "2fa_secret": {
        type: Sequelize.STRING,
      },
    });
    await queryInterface.addIndex("users", ["email", "institution_id"], { unique: true });
    await queryInterface.addIndex("users", ["institution_id", "phone"]);
    await queryInterface.addIndex("users", ["institution_id"]);
    await queryInterface.createTable("guardians", {
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
      "user_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "relation_to_student": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "occupation": {
        type: Sequelize.STRING,
      },
      "emergency_contact": {
        type: Sequelize.STRING,
      },
      "address": {
        type: Sequelize.TEXT,
      },
      "national_id": {
        type: Sequelize.STRING,
      },
      "verified": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("guardians", ["user_id"], { unique: true });
    await queryInterface.createTable("staff", {
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
      "user_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      "staff_number": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "department": {
        type: Sequelize.STRING,
      },
      "designation": {
        type: Sequelize.STRING,
      },
      "qualification": {
        type: Sequelize.STRING,
      },
      "specialization": {
        type: Sequelize.STRING,
      },
      "employment_type": {
        type: Sequelize.ENUM("full_time", "part_time", "contract"),
        allowNull: false,
      },
      "date_joined": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "salary_grade": {
        type: Sequelize.STRING,
      },
    });
    await queryInterface.addIndex("staff", ["user_id"], { unique: true });
    await queryInterface.addIndex("staff", ["institution_id", "staff_number"], { unique: true });
    await queryInterface.addIndex("staff", ["institution_id"]);
    await queryInterface.createTable("classes", {
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
      "level_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "education_levels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "stream": {
        type: Sequelize.STRING,
      },
      "capacity": {
        type: Sequelize.INTEGER,
      },
      "class_teacher_id": {
        type: Sequelize.UUID,
        references: {
          model: "staff",
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
    await queryInterface.addIndex("classes", ["institution_id", "academic_year_id"]);
    await queryInterface.addIndex("classes", ["institution_id", "academic_year_id", "name", "stream"], { unique: true });
    await queryInterface.addIndex("classes", ["institution_id"]);
    await queryInterface.addIndex("classes", ["level_id"]);
    await queryInterface.addIndex("classes", ["class_teacher_id"]);
    await queryInterface.addIndex("classes", ["academic_year_id"]);
    await queryInterface.createTable("subjects", {
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
      "level_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "education_levels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "code": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "subject_type": {
        type: Sequelize.ENUM("core", "elective", "compulsory"),
        allowNull: false,
      },
      "credit_hours": {
        type: Sequelize.INTEGER,
      },
      "is_active": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    });
    await queryInterface.addIndex("subjects", ["institution_id", "code"], { unique: true });
    await queryInterface.addIndex("subjects", ["institution_id"]);
    await queryInterface.addIndex("subjects", ["level_id"]);
    await queryInterface.createTable("class_subjects", {
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
      "class_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "classes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "subject_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "subjects",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "teacher_id": {
        type: Sequelize.UUID,
        references: {
          model: "staff",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "periods_per_week": {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });
    await queryInterface.addIndex("class_subjects", ["class_id", "subject_id", "teacher_id"], { unique: true });
    await queryInterface.addIndex("class_subjects", ["class_id"]);
    await queryInterface.addIndex("class_subjects", ["subject_id"]);
    await queryInterface.addIndex("class_subjects", ["teacher_id"]);
    await queryInterface.createTable("students", {
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
      "user_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      "student_number": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "admission_number": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "class_id": {
        type: Sequelize.UUID,
        references: {
          model: "classes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "level_id": {
        type: Sequelize.UUID,
        references: {
          model: "education_levels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "date_of_birth": {
        type: Sequelize.DATEONLY,
      },
      "gender": {
        type: Sequelize.ENUM("male", "female", "other"),
      },
      "blood_group": {
        type: Sequelize.STRING,
      },
      "nationality": {
        type: Sequelize.STRING,
      },
      "religion": {
        type: Sequelize.STRING,
      },
      "photo_url": {
        type: Sequelize.TEXT,
      },
      "enrollment_date": {
        type: Sequelize.DATEONLY,
      },
      "status": {
        type: Sequelize.ENUM("active", "suspended", "graduated", "withdrawn"),
        allowNull: false,
        defaultValue: "active",
      },
      "guardian_id": {
        type: Sequelize.UUID,
        references: {
          model: "guardians",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
    });
    await queryInterface.addIndex("students", ["student_number", "institution_id"], { unique: true });
    await queryInterface.addIndex("students", ["institution_id", "admission_number"], { unique: true });
    await queryInterface.addIndex("students", ["user_id"]);
    await queryInterface.addIndex("students", ["institution_id"]);
    await queryInterface.addIndex("students", ["class_id"]);
    await queryInterface.addIndex("students", ["level_id"]);
    await queryInterface.addIndex("students", ["guardian_id"]);
    await queryInterface.createTable("student_guardians", {
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
      "guardian_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "guardians",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "is_primary_guardian": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("student_guardians", ["student_id", "guardian_id"], { unique: true });
    await queryInterface.addIndex("student_guardians", ["student_id"]);
    await queryInterface.addIndex("student_guardians", ["guardian_id"]);
    await queryInterface.createTable("student_medical", {
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
      "allergies": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      "chronic_conditions": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      "medications": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      "doctor_name": {
        type: Sequelize.STRING,
      },
      "doctor_phone": {
        type: Sequelize.STRING,
      },
      "insurance_info": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      "blood_group": {
        type: Sequelize.STRING,
      },
      "vaccination_records": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      "dietary_restrictions": {
        type: Sequelize.TEXT,
      },
      "special_needs": {
        type: Sequelize.TEXT,
      },
    });
    await queryInterface.addIndex("student_medical", ["student_id"], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("student_medical");
    await queryInterface.dropTable("student_guardians");
    await queryInterface.dropTable("students");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_students_gender";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_students_status";');
    await queryInterface.dropTable("class_subjects");
    await queryInterface.dropTable("subjects");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subjects_subject_type";');
    await queryInterface.dropTable("classes");
    await queryInterface.dropTable("staff");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_staff_employment_type";');
    await queryInterface.dropTable("guardians");
    await queryInterface.dropTable("users");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  },
};
