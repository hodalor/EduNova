module.exports = (sequelize, DataTypes) => {
  const StudentInvoice = sequelize.define(
    "StudentInvoice",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "student_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
    },
    "institution_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "institutions",
        key: "id",
      },
    },
    "academic_year_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "academic_years",
        key: "id",
      },
    },
    "term_id": {
      type: DataTypes.UUID,
      references: {
        model: "terms_semesters",
        key: "id",
      },
    },
    "invoice_number": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "total_amount": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    "paid_amount": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    "balance": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    "status": {
      type: DataTypes.ENUM("pending", "partial", "paid", "overdue"),
      allowNull: false,
      defaultValue: "pending",
    },
    "due_date": {
      type: DataTypes.DATEONLY,
    },
    "items": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    },
    {
      tableName: "student_invoices",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "academic_year_id"] },
      { fields: ["institution_id", "invoice_number"], unique: true },
      { fields: ["student_id"] },
      { fields: ["institution_id"] },
      { fields: ["academic_year_id"] },
      { fields: ["term_id"] },
      ],
    }
  );

  StudentInvoice.associate = (models) => {
  StudentInvoice.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  StudentInvoice.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  StudentInvoice.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  StudentInvoice.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });
  StudentInvoice.hasMany(models.Payment, { foreignKey: 'invoice_id', as: 'payments' });
  };

  return StudentInvoice;
};
