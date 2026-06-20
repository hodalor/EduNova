'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("fee_structures", {
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
        references: {
          model: "education_levels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
      "term_id": {
        type: Sequelize.UUID,
        references: {
          model: "terms_semesters",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "fee_type": {
        type: Sequelize.ENUM("tuition", "transport", "hostel", "lunch", "activity", "uniform", "exam", "registration"),
        allowNull: false,
      },
      "amount": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "currency": {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "USD",
      },
      "due_date": {
        type: Sequelize.DATEONLY,
      },
      "installments_allowed": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      "penalty_rate": {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
    });
    await queryInterface.addIndex("fee_structures", ["institution_id", "academic_year_id"]);
    await queryInterface.addIndex("fee_structures", ["institution_id", "academic_year_id", "fee_type", "level_id", "class_id", "term_id"], { unique: true });
    await queryInterface.addIndex("fee_structures", ["institution_id"]);
    await queryInterface.addIndex("fee_structures", ["level_id"]);
    await queryInterface.addIndex("fee_structures", ["class_id"]);
    await queryInterface.addIndex("fee_structures", ["academic_year_id"]);
    await queryInterface.addIndex("fee_structures", ["term_id"]);
    await queryInterface.createTable("student_invoices", {
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
      "term_id": {
        type: Sequelize.UUID,
        references: {
          model: "terms_semesters",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "invoice_number": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "total_amount": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "paid_amount": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      "balance": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "status": {
        type: Sequelize.ENUM("pending", "partial", "paid", "overdue"),
        allowNull: false,
        defaultValue: "pending",
      },
      "due_date": {
        type: Sequelize.DATEONLY,
      },
      "items": {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    });
    await queryInterface.addIndex("student_invoices", ["institution_id", "academic_year_id"]);
    await queryInterface.addIndex("student_invoices", ["institution_id", "invoice_number"], { unique: true });
    await queryInterface.addIndex("student_invoices", ["student_id"]);
    await queryInterface.addIndex("student_invoices", ["institution_id"]);
    await queryInterface.addIndex("student_invoices", ["academic_year_id"]);
    await queryInterface.addIndex("student_invoices", ["term_id"]);
    await queryInterface.createTable("payments", {
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
      "invoice_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "student_invoices",
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
      "amount": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "payment_method": {
        type: Sequelize.ENUM("cash", "mobile_money", "bank", "card"),
        allowNull: false,
      },
      "transaction_ref": {
        type: Sequelize.STRING,
      },
      "receipt_number": {
        type: Sequelize.STRING,
      },
      "paid_at": {
        type: Sequelize.DATE,
        allowNull: false,
      },
      "received_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "notes": {
        type: Sequelize.TEXT,
      },
      "is_verified": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("payments", ["invoice_id"]);
    await queryInterface.addIndex("payments", ["student_id"]);
    await queryInterface.addIndex("payments", ["receipt_number"], { unique: true });
    await queryInterface.addIndex("payments", ["transaction_ref"], { unique: true });
    await queryInterface.addIndex("payments", ["received_by"]);
    await queryInterface.createTable("expense_categories", {
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
      "description": {
        type: Sequelize.TEXT,
      },
    });
    await queryInterface.addIndex("expense_categories", ["institution_id", "name"], { unique: true });
    await queryInterface.addIndex("expense_categories", ["institution_id"]);
    await queryInterface.createTable("expenses", {
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
      "category_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "expense_categories",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "amount": {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      "description": {
        type: Sequelize.TEXT,
      },
      "paid_to": {
        type: Sequelize.STRING,
      },
      "payment_method": {
        type: Sequelize.ENUM("cash", "mobile_money", "bank", "card"),
        allowNull: false,
      },
      "receipt_url": {
        type: Sequelize.TEXT,
      },
      "expense_date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "approved_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "status": {
        type: Sequelize.ENUM("pending", "approved", "rejected", "paid"),
        allowNull: false,
        defaultValue: "pending",
      },
    });
    await queryInterface.addIndex("expenses", ["institution_id"]);
    await queryInterface.addIndex("expenses", ["category_id"]);
    await queryInterface.addIndex("expenses", ["approved_by"]);
    await queryInterface.createTable("attendance_sessions", {
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
        references: {
          model: "subjects",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
      "date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "session_type": {
        type: Sequelize.ENUM("morning", "afternoon", "subject"),
        allowNull: false,
      },
      "status": {
        type: Sequelize.ENUM("open", "closed"),
        allowNull: false,
        defaultValue: "open",
      },
    });
    await queryInterface.addIndex("attendance_sessions", ["class_id", "date", "session_type", "subject_id"], { unique: true });
    await queryInterface.addIndex("attendance_sessions", ["class_id"]);
    await queryInterface.addIndex("attendance_sessions", ["subject_id"]);
    await queryInterface.addIndex("attendance_sessions", ["teacher_id"]);
    await queryInterface.createTable("attendance_records", {
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
      "session_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "attendance_sessions",
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
      "status": {
        type: Sequelize.ENUM("present", "absent", "late", "excused"),
        allowNull: false,
      },
      "marked_at": {
        type: Sequelize.DATE,
      },
      "marked_by": {
        type: Sequelize.UUID,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "notes": {
        type: Sequelize.TEXT,
      },
      "arrival_time": {
        type: Sequelize.TIME,
      },
    });
    await queryInterface.addIndex("attendance_records", ["session_id", "student_id"], { unique: true });
    await queryInterface.addIndex("attendance_records", ["session_id"]);
    await queryInterface.addIndex("attendance_records", ["student_id"]);
    await queryInterface.addIndex("attendance_records", ["marked_by"]);
    await queryInterface.createTable("staff_attendance", {
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
      "staff_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "staff",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "check_in": {
        type: Sequelize.TIME,
      },
      "check_out": {
        type: Sequelize.TIME,
      },
      "status": {
        type: Sequelize.STRING,
      },
      "method": {
        type: Sequelize.ENUM("biometric", "manual"),
        allowNull: false,
      },
    });
    await queryInterface.addIndex("staff_attendance", ["staff_id", "date"], { unique: true });
    await queryInterface.addIndex("staff_attendance", ["staff_id"]);
    await queryInterface.createTable("assessments", {
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
      "term_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "terms_semesters",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      "title": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "assessment_type": {
        type: Sequelize.ENUM("quiz", "test", "exam", "assignment", "project", "cat", "midterm", "final"),
        allowNull: false,
      },
      "max_score": {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
      },
      "weight_percentage": {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      "date": {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      "instructions": {
        type: Sequelize.TEXT,
      },
    });
    await queryInterface.addIndex("assessments", ["class_id", "subject_id", "term_id", "title"]);
    await queryInterface.addIndex("assessments", ["class_id"]);
    await queryInterface.addIndex("assessments", ["subject_id"]);
    await queryInterface.addIndex("assessments", ["teacher_id"]);
    await queryInterface.addIndex("assessments", ["term_id"]);
    await queryInterface.createTable("assessment_scores", {
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
      "assessment_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "assessments",
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
      "score": {
        type: Sequelize.DECIMAL(8, 2),
      },
      "grade": {
        type: Sequelize.STRING,
      },
      "remarks": {
        type: Sequelize.TEXT,
      },
      "submitted_at": {
        type: Sequelize.DATE,
      },
      "marked_at": {
        type: Sequelize.DATE,
      },
      "is_absent": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });
    await queryInterface.addIndex("assessment_scores", ["assessment_id", "student_id"], { unique: true });
    await queryInterface.addIndex("assessment_scores", ["assessment_id"]);
    await queryInterface.addIndex("assessment_scores", ["student_id"]);
    await queryInterface.createTable("grade_scales", {
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
        references: {
          model: "education_levels",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "name": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "min_score": {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      "max_score": {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      "grade": {
        type: Sequelize.STRING,
        allowNull: false,
      },
      "gpa_point": {
        type: Sequelize.DECIMAL(4, 2),
      },
      "remark": {
        type: Sequelize.STRING,
      },
    });
    await queryInterface.addIndex("grade_scales", ["institution_id", "level_id", "name", "grade"], { unique: true });
    await queryInterface.addIndex("grade_scales", ["institution_id"]);
    await queryInterface.addIndex("grade_scales", ["level_id"]);
    await queryInterface.createTable("report_cards", {
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
      "term_id": {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "terms_semesters",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      "class_id": {
        type: Sequelize.UUID,
        references: {
          model: "classes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      "overall_average": {
        type: Sequelize.DECIMAL(5, 2),
      },
      "overall_grade": {
        type: Sequelize.STRING,
      },
      "position_in_class": {
        type: Sequelize.INTEGER,
      },
      "teacher_remark": {
        type: Sequelize.TEXT,
      },
      "head_remark": {
        type: Sequelize.TEXT,
      },
      "is_published": {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      "published_at": {
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex("report_cards", ["student_id", "term_id", "academic_year_id"], { unique: true });
    await queryInterface.addIndex("report_cards", ["student_id"]);
    await queryInterface.addIndex("report_cards", ["term_id"]);
    await queryInterface.addIndex("report_cards", ["academic_year_id"]);
    await queryInterface.addIndex("report_cards", ["class_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("report_cards");
    await queryInterface.dropTable("grade_scales");
    await queryInterface.dropTable("assessment_scores");
    await queryInterface.dropTable("assessments");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_assessments_assessment_type";');
    await queryInterface.dropTable("staff_attendance");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_staff_attendance_method";');
    await queryInterface.dropTable("attendance_records");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_attendance_records_status";');
    await queryInterface.dropTable("attendance_sessions");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_attendance_sessions_session_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_attendance_sessions_status";');
    await queryInterface.dropTable("expenses");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_expenses_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_expenses_status";');
    await queryInterface.dropTable("expense_categories");
    await queryInterface.dropTable("payments");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_payment_method";');
    await queryInterface.dropTable("student_invoices");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_student_invoices_status";');
    await queryInterface.dropTable("fee_structures");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_fee_structures_fee_type";');
  },
};
